import { Request, Response } from "express";
import QuestionModel from "../models/questionModel";
import ExamModel from "../models/examModel";
import ExamSubmissionModel from "../models/examSubmissionModel";

export async function getQuestionsByExam(req: Request, res: Response): Promise<void> {
  try {
    const { examId } = req.params;
    const questions = await QuestionModel.find({ exam: examId }).sort({ createdAt: 1 });
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function createQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { examId, text, type, options, correctAnswer, points } = req.body;

    if (!examId || !text || !type || !correctAnswer) {
      res.status(400).json({ message: "examId, text, type, and correctAnswer are required." });
      return;
    }

    const examExists = await ExamModel.exists({ _id: examId });
    if (!examExists) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }

    const question = await QuestionModel.create({
      exam: examId,
      text,
      type,
      options: type === "mcq" ? options : [],
      correctAnswer,
      points: points || 1,
    });

    res.status(201).json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function updateQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { text, type, options, correctAnswer, points } = req.body;

    const updated = await QuestionModel.findByIdAndUpdate(
      id,
      { text, type, options: type === "mcq" ? options : [], correctAnswer, points },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: "Question not found." });
      return;
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function deleteQuestion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await QuestionModel.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ message: "Question not found." });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function submitExam(req: Request, res: Response): Promise<void> {
  try {
    const { examId, studentId, answers } = req.body;

    if (!examId || !studentId || !Array.isArray(answers)) {
      res.status(400).json({ message: "examId, studentId, and answers are required." });
      return;
    }

    const examExists = await ExamModel.exists({ _id: examId });
    if (!examExists) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }

    const alreadySubmitted = await ExamSubmissionModel.findOne({ exam: examId, student: studentId });
    if (alreadySubmitted) {
      res.status(400).json({ message: "You have already submitted this exam." });
      return;
    }

    const questions = await QuestionModel.find({ exam: examId });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    let score = 0;
    let totalPoints = 0;

    const processedAnswers = answers.map(ans => {
      const question = questionMap.get(ans.questionId);
      if (!question) return null;

      totalPoints += question.points;
      const isCorrect = question.correctAnswer.trim().toLowerCase() === (ans.answer || "").trim().toLowerCase();
      if (isCorrect) score += question.points;

      return {
        question: ans.questionId,
        answer: ans.answer || "",
        isCorrect,
      };
    }).filter(Boolean);

    const submission = await ExamSubmissionModel.create({
      exam: examId,
      student: studentId,
      answers: processedAnswers,
      score,
      totalPoints,
    });

    res.status(201).json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getSubmissionByStudent(req: Request, res: Response): Promise<void> {
  try {
    const { examId, studentId } = req.params;
    
    // Check if results are published for this exam
    const exam = await ExamModel.findById(examId).select("resultsPublished");
    if (!exam) {
      res.status(404).json({ message: "Exam not found." });
      return;
    }
    
    if (!exam.resultsPublished) {
      res.status(403).json({ message: "Results not published yet." });
      return;
    }
    
    const submission = await ExamSubmissionModel.findOne({ exam: examId, student: studentId })
      .populate("exam", "title academicYear resultsPublished")
      .populate("student", "name");
    
    if (!submission) {
      res.status(404).json({ message: "No submission found." });
      return;
    }

    // Calculate derived fields for frontend
    const correctAnswers = submission.answers.filter(a => a.isCorrect).length;
    const wrongAnswers = submission.answers.filter(a => !a.isCorrect).length;
    const unanswered = (submission.exam as any)?.totalQuestions 
      ? (submission.exam as any).totalQuestions - submission.answers.length 
      : 0;
    const percentage = submission.totalPoints > 0 
      ? Math.round((submission.score / submission.totalPoints) * 100) 
      : 0;

    res.json({
      ...submission.toObject(),
      correctAnswers,
      wrongAnswers,
      unanswered,
      percentage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function getExamResults(req: Request, res: Response): Promise<void> {
  try {
    const { examId } = req.params;
    const submissions = await ExamSubmissionModel.find({ exam: examId })
      .populate("student", "name group")
      .sort({ score: -1 });

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error." });
  }
}
