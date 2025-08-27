"use client"

import { ReactNode, useState, useEffect } from "react"
import { X, Plus, Trash2, Eye, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { HtmlContent } from "@/components/ui/html-content"

interface QuestionOption {
  text: string
  isCorrect: boolean
  id?: string
}

interface QuestionData {
  type: "mcq" | "text" | "multi-select"
  text: string
  options: QuestionOption[]
  correctAnswer: string
  positiveMarks: number | null
  negativeMarks: number | null
}

interface ModalSection {
  id: string
  title: string
  duration?: number | null
  defaultPositiveMarks?: number | null
  defaultNegativeMarks?: number | null
  testId: string
  questions?: any[]
}

interface QuestionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: QuestionData) => void
  section: ModalSection | null
  initialQuestion?: QuestionData
  isLoading?: boolean
}

export function QuestionModal({
  isOpen,
  onClose,
  onSave,
  section,
  initialQuestion,
  isLoading = false
}: QuestionModalProps) {
  const [modalKey, setModalKey] = useState(0)
  const [question, setQuestion] = useState<QuestionData>({
    type: "mcq",
    text: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false }
    ],
    correctAnswer: "",
    positiveMarks: null,
    negativeMarks: null
  })

  // Preview is always enabled, no need for toggle state

  // Handle initial question data
  useEffect(() => {
    if (isOpen && initialQuestion) {
      // Always set the question data when we have an initial question
      setQuestion({
        type: initialQuestion.type,
        text: initialQuestion.text,
        options: initialQuestion.options?.length > 0 ? [...initialQuestion.options] : [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false }
        ],
        correctAnswer: initialQuestion.correctAnswer || "",
        positiveMarks: initialQuestion.positiveMarks,
        negativeMarks: initialQuestion.negativeMarks
      })
      // Force re-render of form components
      setModalKey(prev => prev + 1)
    } else if (isOpen && !initialQuestion) {
      // Reset to default when opening for new question
      setQuestion({
        type: "mcq",
        text: "",
        options: [
          { text: "", isCorrect: false },
          { text: "", isCorrect: false }
        ],
        correctAnswer: "",
        positiveMarks: section?.defaultPositiveMarks ?? null,
        negativeMarks: section?.defaultNegativeMarks ?? null
      })
      // Force re-render of form components
      setModalKey(prev => prev + 1)
    }
  }, [isOpen, initialQuestion, section?.defaultPositiveMarks, section?.defaultNegativeMarks])

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const newOptions = [...question.options]
    
    if (field === "isCorrect" && question.type === "mcq" && value) {
      // For single choice, uncheck all others
      newOptions.forEach((opt, i) => {
        opt.isCorrect = i === index
      })
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value }
    }
    
    setQuestion({ ...question, options: newOptions })
  }

  const addOption = () => {
    setQuestion({
      ...question,
      options: [...question.options, { text: "", isCorrect: false }]
    })
  }

  const removeOption = (index: number) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index)
      setQuestion({ ...question, options: newOptions })
    }
  }

  const handleSave = () => {
    onSave(question)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  if (!isOpen) return null

  const hasCorrectAnswer = question.type === "text" 
    ? question.correctAnswer.trim() !== ""
    : question.options.some(opt => opt.isCorrect && opt.text.trim() !== "")

  const isValid = question.text.trim() !== "" && hasCorrectAnswer

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[90vh] mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {initialQuestion ? "Edit Question" : "Add New Question"}
            </h2>
            {section && (
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Section: {section.title}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex min-h-0">
          {/* Form Side */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
            <div className="space-y-6 max-w-2xl">
              {/* Question Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Question Type</Label>
                <select
                  key={`question-type-${modalKey}`}
                  value={question.type}
                  onChange={(e) => setQuestion({ 
                    ...question, 
                    type: e.target.value as "mcq" | "text" | "multi-select",
                    options: e.target.value === "text" ? [] : question.options.length === 0 ? [
                      { text: "", isCorrect: false },
                      { text: "", isCorrect: false }
                    ] : question.options
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="mcq">Multiple Choice (Single Answer)</option>
                  <option value="multi-select">Multiple Choice (Multiple Answers)</option>
                  <option value="text">Text Answer</option>
                </select>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Question Text</Label>
                <RichTextEditor
                  key={`question-text-${modalKey}`}
                  content={question.text}
                  onChange={(content) => setQuestion({ ...question, text: content })}
                  placeholder="Enter your question..."
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Use the toolbar to format text, add images, or insert math equations
                </p>
              </div>

              {/* Correct Answer for Text Questions */}
              {question.type === "text" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Correct Answer</Label>
                  <Input
                    key={`correct-answer-${modalKey}`}
                    placeholder="Enter the correct answer..."
                    value={question.correctAnswer}
                    onChange={(e) => setQuestion({ ...question, correctAnswer: e.target.value })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">This will be used to automatically grade text responses</p>
                </div>
              )}

              {/* Answer Options for MCQ */}
              {question.type !== "text" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">Answer Options</Label>
                  <div className="space-y-3">
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 w-6">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          <input
                            type={question.type === "mcq" ? "radio" : "checkbox"}
                            name="correct-answer"
                            checked={option.isCorrect}
                            onChange={(e) => updateOption(index, "isCorrect", e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                        </div>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => updateOption(index, "text", e.target.value)}
                          className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          disabled={isLoading}
                        />
                        {question.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={addOption}
                      className="border-gray-300 border-dashed hover:border-blue-500 hover:text-blue-600"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Marks Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Positive Marks</Label>
                  <Input
                    key={`positive-marks-${modalKey}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={`Default: ${section?.defaultPositiveMarks ?? 1.0}`}
                    value={question.positiveMarks ?? ""}
                    onChange={(e) => setQuestion({ 
                      ...question, 
                      positiveMarks: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">Clear to use section default</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Negative Marks</Label>
                  <Input
                    key={`negative-marks-${modalKey}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={`Default: ${section?.defaultNegativeMarks ?? 0.0}`}
                    value={question.negativeMarks ?? ""}
                    onChange={(e) => setQuestion({ 
                      ...question, 
                      negativeMarks: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">Clear to use section default</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className="w-1/2 p-6 bg-gray-50 overflow-y-auto">
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  {/* Question Preview */}
                  <div className="mb-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        Q1
                      </div>
                      <div className="flex-1">
                        <div className="text-gray-900 mb-2">
                          {question.text ? (
                            <HtmlContent content={question.text} />
                          ) : (
                            <span className="text-gray-400 italic">Enter question text to see preview</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                            {question.type.toUpperCase()}
                          </span>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                            +{question.positiveMarks ?? section?.defaultPositiveMarks ?? 1.0} / 
                            -{question.negativeMarks ?? section?.defaultNegativeMarks ?? 0.0} marks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Answer Options Preview */}
                    {question.type !== "text" ? (
                      <div className="space-y-2 ml-11">
                        {question.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 border border-gray-200 rounded">
                            <input
                              type={question.type === "mcq" ? "radio" : "checkbox"}
                              name="preview-answer"
                              disabled
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-600">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="text-sm text-gray-900">
                              {option.text || `Option ${index + 1}`}
                            </span>
                            {option.isCorrect && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto">
                                Correct
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ml-11">
                        <textarea
                          placeholder="Student will type their answer here..."
                          disabled
                          className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                          rows={3}
                        />
                        {question.correctAnswer && (
                          <p className="text-xs text-green-600 mt-1">
                            Expected answer: {question.correctAnswer}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {!isValid && (
              <span className="text-red-600">
                Please fill in the question text and mark at least one correct answer
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !isValid}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                initialQuestion ? "Update Question" : "Add Question"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
