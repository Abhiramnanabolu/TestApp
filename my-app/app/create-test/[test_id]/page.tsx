"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

interface Test {
  id: string
  title: string
  description: string
  availabilityStart: string
  availabilityEnd: string
  totalDuration: number
  shuffleQuestions?: boolean
  allowSectionNav?: boolean
  negativeMarking?: boolean
  showResultsInstant?: boolean
  status?: "draft" | "published"
  sections?: Section[]
}

interface Section {
  id: string
  title: string
  duration?: number | null
  testId: string
  questions?: Question[]
}

interface Question {
  id: string
  type: "mcq" | "text" | "multi-select"
  text: string
  sectionId: string
  options?: Option[]
}

interface Option {
  id: string
  text: string
  isCorrect: boolean
  questionId: string
}

// left navigation simplified to two views

export default function TestPage() {
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // deprecated in favor of activeView
  const [currentStep, setCurrentStep] = useState("details")
  const [localSections, setLocalSections] = useState<Section[]>([])
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState({
    type: "mcq" as "mcq" | "text" | "multi-select",
    text: "",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  })
  const { test_id: testId } = useParams<{ test_id: string }>()
  const router = useRouter()

  const [activeView, setActiveView] = useState("details")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const response = await fetch(`/api/test/${testId}`, {
          method: "GET",
          credentials: "include",
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to fetch test")
        }

        const data = await response.json()
        setTest(data.test)
        setLocalSections(data.test.sections || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (!testId) return
    fetchTest()
  }, [testId])

  const addSection = () => {
    if (!newSectionTitle.trim()) return

    const newSection: Section = {
      id: `temp-${Date.now()}`,
      title: newSectionTitle,
      testId: testId,
      questions: [],
    }

    setLocalSections([...localSections, newSection])
    setNewSectionTitle("")
  }

  const deleteSection = (sectionId: string) => {
    setLocalSections(localSections.filter((s) => s.id !== sectionId))
    if (selectedSection === sectionId) {
      setSelectedSection(null)
    }
  }

  const addQuestion = () => {
    if (!selectedSection || !newQuestion.text.trim()) return

    const question: Question = {
      id: `temp-q-${Date.now()}`,
      type: newQuestion.type,
      text: newQuestion.text,
      sectionId: selectedSection,
      options:
        newQuestion.type !== "text"
          ? newQuestion.options
              .filter((opt) => opt.text.trim())
              .map((opt, index) => ({
                id: `temp-opt-${Date.now()}-${index}`,
                text: opt.text,
                isCorrect: opt.isCorrect,
                questionId: `temp-q-${Date.now()}`,
              }))
          : undefined,
    }

    setLocalSections(
      localSections.map((section) =>
        section.id === selectedSection ? { ...section, questions: [...(section.questions || []), question] } : section,
      ),
    )

    setNewQuestion({
      type: "mcq",
      text: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    })
    setIsAddingQuestion(false)
  }

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setLocalSections(
      localSections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: section.questions?.filter((q) => q.id !== questionId) }
          : section,
      ),
    )
  }

  const addOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, { text: "", isCorrect: false }],
    })
  }

  const updateOption = (index: number, field: "text" | "isCorrect", value: string | boolean) => {
    const updatedOptions = newQuestion.options.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    setNewQuestion({ ...newQuestion, options: updatedOptions })
  }

  const removeOption = (index: number) => {
    if (newQuestion.options.length > 2) {
      setNewQuestion({
        ...newQuestion,
        options: newQuestion.options.filter((_, i) => i !== index),
      })
    }
  }

  const saveChanges = async () => {
    if (!testId) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch(`/api/test/${testId}/sections`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ sections: localSections }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to save changes")
      }

      setSaveMessage("Changes saved successfully!")
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save changes")
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">No test found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar Navigation */}
      <div className="w-80 border-r border-gray-100 bg-gray-50/50">
        <div className="p-6">
          <nav className="space-y-2">
            {/* Test Details */}
            <button
              onClick={() => setActiveView("details")}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                activeView === "details"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">Test Details</span>
            </button>

            {/* Sections */}
            <div className="space-y-1">
              <button
                onClick={() => setActiveView("sections")}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                  activeView === "sections"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="font-medium">Sections</span>
                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {localSections.length}
                </span>
              </button>

              {/* Collapsible Section List */}
              {localSections.length > 0 && (
                <div className="ml-4 space-y-1">
                  {localSections.map((section, index) => (
                    <div key={section.id} className="space-y-1">
                      <button
                        onClick={() => toggleSectionCollapse(section.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-white/50 rounded-lg transition-colors"
                      >
                        {collapsedSections.has(section.id) ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        <span className="truncate">{section.title}</span>
                        <span className="ml-auto text-xs text-gray-400">{section?.questions?.length || 0}</span>
                      </button>

                      {/* Questions under each section */}
                      {!collapsedSections.has(section.id) && section?.questions?.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {section?.questions?.slice(0, 3).map((question, qIndex) => (
                            <div key={question.id} className="px-3 py-1 text-xs text-gray-500 truncate">
                              {qIndex + 1}. {question.text}
                            </div>
                          ))}
                          {(section.questions?.length ?? 0) > 3 && (
                            <div className="px-3 py-1 text-xs text-gray-400">+{(section.questions?.length ?? 0) - 3} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/home")}
                className="p-2 hover:bg-gray-50 rounded-lg shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
              <div className="min-w-0">
                <div className="text-sm uppercase tracking-wider text-gray-400">Test</div>
                <h1 className="text-xl font-semibold text-gray-900 truncate">{test.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-700 capitalize">
                {test.status || "draft"}
              </div>
              <Button onClick={saveChanges} disabled={isSaving} className="bg-gray-900 hover:bg-black text-white px-5">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          {activeView === "details" && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Test Details</h2>
                <p className="text-gray-600">Basic information about your test</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <div className="text-gray-900 font-medium">{test.title}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {test.status || "draft"}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <div className="text-gray-600">{test.description}</div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <div className="text-gray-900">{test.totalDuration} minutes</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <div className="text-gray-900">{new Date(test.availabilityStart).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <div className="text-gray-900">{new Date(test.availabilityEnd).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "sections" && (
            <div className="max-w-4xl">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sections & Questions</h2>
                <p className="text-gray-600">Organize your questions into sections</p>
              </div>

              {localSections.length > 0 ? (
                <div className="space-y-6 mb-8">
                  {localSections.map((section, index) => (
                    <div key={section.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{section.title}</h3>
                              <p className="text-sm text-gray-500">{section.questions?.length || 0} questions</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSection(section.id)
                                setIsAddingQuestion(true)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Question
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSection(section.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        {section.questions?.length ? (
                          <div className="space-y-4">
                            {section.questions.map((question, qIndex) => (
                              <div key={question.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-6 h-6 bg-white text-gray-600 rounded-md flex items-center justify-center text-sm font-medium mt-1">
                                      {qIndex + 1}
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 mb-2">{question.text}</div>
                                      <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700">
                                        {question.type.toUpperCase()}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteQuestion(section.id, question.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                {question.options && (
                                  <div className="space-y-2 ml-9">
                                    {question.options.map((option, optIndex) => (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <div
                                          className={`w-2 h-2 rounded-full ${option.isCorrect ? "bg-green-500" : "bg-gray-300"}`}
                                        />
                                        <span
                                          className={`text-sm ${option.isCorrect ? "text-green-700 font-medium" : "text-gray-600"}`}
                                        >
                                          {option.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                              <HelpCircle className="w-6 h-6 text-gray-400" />
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">No questions yet</h4>
                            <p className="text-gray-500 text-sm">Add your first question to this section</p>
                          </div>
                        )}

                        {selectedSection === section.id && isAddingQuestion && (
                          <div className="mt-6 pt-6 border-t border-gray-100">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">New Question</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setIsAddingQuestion(false)
                                    setSelectedSection(null)
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                                  <Select
                                    value={newQuestion.type}
                                    onValueChange={(value: "mcq" | "text" | "multi-select") =>
                                      setNewQuestion({ ...newQuestion, type: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                                      <SelectItem value="multi-select">Multi-Select</SelectItem>
                                      <SelectItem value="text">Text Answer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                                <Textarea
                                  value={newQuestion.text}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                  placeholder="Enter your question..."
                                  className="min-h-[80px]"
                                />
                              </div>

                              {newQuestion.type !== "text" && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-3">Answer Options</label>
                                  <div className="space-y-3">
                                    {newQuestion.options.map((option, index) => (
                                      <div key={index} className="flex items-center gap-3">
                                        <Switch
                                          checked={option.isCorrect}
                                          onCheckedChange={(checked) => updateOption(index, "isCorrect", checked)}
                                        />
                                        <Input
                                          value={option.text}
                                          onChange={(e) => updateOption(index, "text", e.target.value)}
                                          placeholder={`Option ${index + 1}...`}
                                          className="flex-1"
                                        />
                                        {newQuestion.options.length > 2 && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(index)}
                                            className="text-red-500 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={addOption}
                                      className="w-full bg-transparent"
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Add Option
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <Button
                                  onClick={addQuestion}
                                  disabled={!newQuestion.text.trim()}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Question
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setIsAddingQuestion(false)
                                    setSelectedSection(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-12 text-center mb-8">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
                  <p className="text-gray-500">Create your first section to get started</p>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-medium text-gray-900 mb-4">Add New Section</h3>
                <div className="flex gap-3">
                  <Input
                    placeholder="Section title..."
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addSection()}
                    className="flex-1"
                  />
                  <Button onClick={addSection} disabled={!newSectionTitle.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Created view removed for minimalist sidebar */}

          {saveMessage && (
            <div
              className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg ${
                saveMessage.includes("success")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {saveMessage}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
