import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Drop-in replacement for a native <select> with <option> children.
// Same props (value, onChange, name, required, disabled, className, id) and onChange receives
// an event-like object whose target.value is a string, exactly like the native element.
// A hidden native <select> mirrors the value so form submission and `required` validation behave as before.

function collectOptions(children, out = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) return collectOptions(child.props.children, out);
    if (child.type !== "option") return;
    const { value, children: label, disabled } = child.props;
    const text = Children.toArray(label).join("");
    out.push({ value: String(value ?? text), label, text, disabled: !!disabled });
  });
  return out;
}

const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 256;
const VIEWPORT_PADDING = 8;

export default function Select({
  value,
  onChange,
  name,
  required = false,
  disabled = false,
  error = false,
  placeholder,
  className = "",
  id,
  children,
  "aria-label": ariaLabel,
}) {
  const options = useMemo(() => collectOptions(children), [children]);
  const current = String(value ?? "");
  // Like a native select, an unmatched value displays the first option.
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === current));
  const selected = options.length ? options[selectedIndex] : null;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const listboxId = useId();
  const optionId = (i) => `${listboxId}-opt-${i}`;

  const emit = useCallback(
    (option) => {
      setInvalid(false);
      if (option.value === current) return;
      const target = { name, value: option.value };
      onChange?.({ target, currentTarget: target, preventDefault() {}, stopPropagation() {} });
    },
    [current, name, onChange]
  );

  const enabledIndex = (from, step) => {
    for (let i = from; i >= 0 && i < options.length; i += step) if (!options[i].disabled) return i;
    return -1;
  };

  const openMenu = () => {
    if (disabled || options.length === 0) return;
    setActive(options[selectedIndex]?.disabled ? enabledIndex(0, 1) : selectedIndex);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (i) => {
    const option = options[i];
    if (!option || option.disabled) return;
    emit(option);
    close();
  };

  // Floating position: below the trigger, or above it when there is not enough room below.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 160), vw - VIEWPORT_PADDING * 2);
    // RTL: align the menu's right edge with the trigger's right edge, then keep it inside the viewport.
    const left = Math.min(Math.max(rect.right - width, VIEWPORT_PADDING), vw - width - VIEWPORT_PADDING);
    const wanted = Math.min(options.length * 40 + 8, MENU_MAX_HEIGHT);
    const below = vh - rect.bottom - MENU_GAP - VIEWPORT_PADDING;
    const above = rect.top - MENU_GAP - VIEWPORT_PADDING;
    const upward = below < wanted && above > below;
    setPosition(
      upward
        ? { left, width, bottom: vh - rect.top + MENU_GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, above), upward }
        : { left, width, top: rect.bottom + MENU_GAP, maxHeight: Math.min(MENU_MAX_HEIGHT, Math.max(below, 120)), upward }
    );
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updatePosition]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the active option visible while navigating.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, position]);

  // Disabled while open: close it.
  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  const findByText = (char) => {
    const t = typeahead.current;
    clearTimeout(t.timer);
    t.text += char.toLowerCase();
    t.timer = setTimeout(() => (t.text = ""), 600);
    const start = (open ? active : selectedIndex) + (t.text.length === 1 ? 1 : 0);
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (!options[i].disabled && options[i].text.trim().toLowerCase().startsWith(t.text)) return i;
    }
    return -1;
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    const { key } = e;
    if (!open) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        e.preventDefault();
        openMenu();
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Native behaviour: typing on a closed select picks the matching option.
        const i = findByText(key);
        if (i >= 0) emit(options[i]);
      }
      return;
    }
    switch (key) {
      case "ArrowDown": {
        e.preventDefault();
        const i = enabledIndex(active + 1, 1);
        if (i >= 0) setActive(i);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const i = enabledIndex(active - 1, -1);
        if (i >= 0) setActive(i);
        break;
      }
      case "Home":
        e.preventDefault();
        setActive(enabledIndex(0, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(enabledIndex(options.length - 1, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const i = findByText(key);
          if (i >= 0) setActive(i);
        }
    }
  };

  const showError = error || invalid;
  // A native select is opaque; keep that when the caller sets no background of its own.
  const background = /(^|\s)bg-/.test(className) ? "" : "bg-white";
  const isPlaceholder = !selected || selected.value === "";
  const label = selected ? selected.label : placeholder;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={showError || undefined}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex items-center justify-between gap-2 text-start cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${background} ${className} ${
          showError ? "!border-red-500 ring-2 ring-red-500/20" : ""
        }`}
      >
        <span className={`truncate ${isPlaceholder ? "text-slate-400" : ""}`}>{label}</span>
        <svg
          className={`w-4 h-4 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Mirrors the value for form submission and native `required` validation. */}
      <select
        tabIndex={-1}
        aria-hidden="true"
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        onInvalid={() => setInvalid(true)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.text}
          </option>
        ))}
      </select>

      {open &&
        position &&
        createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="select-menu fixed z-[1000] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white py-1 shadow-xl text-sm text-slate-700"
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
              transformOrigin: position.upward ? "bottom" : "top",
              "--select-menu-shift": position.upward ? "4px" : "-4px",
            }}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex && o.value === current;
              return (
                <li
                  key={`${o.value}-${i}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => choose(i)}
                  className={`mx-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                    o.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  } ${i === active ? "bg-slate-100" : isSelected ? "bg-indigo-50" : ""} ${isSelected ? "font-semibold text-indigo-700" : ""}`}
                >
                  <span className={`truncate ${o.value === "" ? "text-slate-400" : ""}`}>{o.label}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 shrink-0 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}
