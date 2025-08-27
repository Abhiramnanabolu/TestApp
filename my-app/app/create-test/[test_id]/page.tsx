"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { HtmlContent } from "@/components/ui/html-content"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { QuestionModal } from "@/components/ui/question-modal"
import { ArrowLeft, Trash2, ChevronDown, ChevronRight, AlertTriangle, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

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
  defaultPositiveMarks?: number | null
  defaultNegativeMarks?: number | null
  testId: string
  questions?: Question[]
}

interface Question {
  id: string
  type: "mcq" | "text" | "multi-select"
  text: string
  correctAnswer?: string | null
  positiveMarks?: number | null
  negativeMarks?: number | null
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
  const [localSections, setLocalSections] = useState<Section[]>([])
  const [newSectionTitle, setNewSectionTitle] = useState("")
  const [newSectionDuration, setNewSectionDuration] = useState<number | "">("")
  const [sectionMarksEdit, setSectionMarksEdit] = useState({ positiveMarks: 1.0, negativeMarks: 0.0 })
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editedSectionTitle, setEditedSectionTitle] = useState("")
  const [editedSectionDuration, setEditedSectionDuration] = useState<number | "">("")
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  // const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [newQuestion, setNewQuestion] = useState({
    type: "mcq" as "mcq" | "text" | "multi-select",
    text: "",
    correctAnswer: "", // For text answer type
    positiveMarks: null as number | null,
    negativeMarks: null as number | null,
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  })
  const { test_id: testId } = useParams<{ test_id: string }>()
  const router = useRouter()

  const [activeView, setActiveView] = useState("details")
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Test details editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editedTest, setEditedTest] = useState<Partial<Test>>({})
  const [isUpdatingTest, setIsUpdatingTest] = useState(false)

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    type: 'section' | 'question'
    id: string
    sectionId?: string
    title: string
    isDeleting: boolean
  }>({ isOpen: false, type: 'section', id: '', title: '', isDeleting: false })

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
        // Initialize edited test with current values
        setEditedTest({
          title: data.test.title,
          description: data.test.description,
          availabilityStart: data.test.availabilityStart,
          availabilityEnd: data.test.availabilityEnd,
          totalDuration: data.test.totalDuration,
          shuffleQuestions: data.test.shuffleQuestions,
          allowSectionNav: data.test.allowSectionNav,
          negativeMarking: data.test.negativeMarking,
          showResultsInstant: data.test.showResultsInstant,
          status: data.test.status,
        })
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
    console.log("addSection called") // Debug log
    console.log("newSectionTitle:", newSectionTitle) // Debug log
    console.log("localSections before:", localSections) // Debug log
    
    if (!newSectionTitle.trim()) {
      console.log("Empty section title, returning") // Debug log
      toast.error("Please enter a section title")
      return
    }

    if (!newSectionDuration) {
      console.log("No duration set, returning") // Debug log
      toast.error("Please enter section duration in minutes")
      return
    }

    const newSection: Section = {
      id: `temp-${Date.now()}`,
      title: newSectionTitle,
      duration: newSectionDuration ? Number(newSectionDuration) : null,
      defaultPositiveMarks: 1.0,
      defaultNegativeMarks: 0.0,
      testId: testId,
      questions: [],
    }

    console.log("New section created:", newSection) // Debug log
    
    setLocalSections([...localSections, newSection])
    setNewSectionTitle("")
    setNewSectionDuration("")
    
    console.log("localSections after:", [...localSections, newSection]) // Debug log
    toast.success(`Section "${newSection.title}" added successfully!`)
  }

  const openDeleteSectionModal = (sectionId: string, title: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'section',
      id: sectionId,
      title,
      isDeleting: false
    })
  }

  const deleteSection = async (sectionId: string) => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      // Simulate API call delay (replace with actual API call if needed)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLocalSections(localSections.filter((s) => s.id !== sectionId))
      if (selectedSection === sectionId) {
        setSelectedSection(null)
      }
      
      toast.success(`Section "${deleteModal.title}" deleted successfully`, {
        description: 'The section and all its questions have been removed.'
      })
      
      setDeleteModal({ isOpen: false, type: 'section', id: '', title: '', isDeleting: false })
    } catch (error) {
      toast.error('Failed to delete section', {
        description: 'Please try again later.'
      })
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const addQuestion = () => {
    if (!selectedSection || !newQuestion.text.trim()) return
    if (newQuestion.type === "text" && !newQuestion.correctAnswer.trim()) return

    const question: Question = {
      id: `temp-q-${Date.now()}`,
      type: newQuestion.type,
      text: newQuestion.text,
      correctAnswer: newQuestion.type === "text" ? newQuestion.correctAnswer : null,
      positiveMarks: newQuestion.positiveMarks,
      negativeMarks: newQuestion.negativeMarks,
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

    // Reset form but keep section defaults for marks
    const currentSection = localSections.find(s => s.id === selectedSection)
    setNewQuestion({
      type: "mcq",
      text: "",
      correctAnswer: "",
      positiveMarks: currentSection?.defaultPositiveMarks ?? 1.0,
      negativeMarks: currentSection?.defaultNegativeMarks ?? 0.0,
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    })
    setIsAddingQuestion(false)
  }

  const openEditQuestionModal = (question: Question) => {
    setEditingQuestion(question)
    setSelectedSection(question.sectionId)
    setIsQuestionModalOpen(true)
  }

  const openDeleteQuestionModal = (sectionId: string, questionId: string, questionText: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'question',
      id: questionId,
      sectionId,
      title: questionText.length > 50 ? questionText.substring(0, 50) + '...' : questionText,
      isDeleting: false
    })
  }

  const deleteQuestion = async (sectionId: string, questionId: string) => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }))
    
    try {
      // Simulate API call delay (replace with actual API call if needed)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setLocalSections(
        localSections.map((section) =>
          section.id === sectionId
            ? { ...section, questions: section.questions?.filter((q) => q.id !== questionId) }
            : section,
        ),
      )
      
      toast.success('Question deleted successfully', {
        description: 'The question has been removed from the section.'
      })
      
      setDeleteModal({ isOpen: false, type: 'section', id: '', title: '', isDeleting: false })
    } catch (error) {
      toast.error('Failed to delete question', {
        description: 'Please try again later.'
      })
      setDeleteModal(prev => ({ ...prev, isDeleting: false }))
    }
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

  const validateDates = () => {
    const now = new Date()
    const start = editedTest.availabilityStart ? new Date(editedTest.availabilityStart) : null
    const end = editedTest.availabilityEnd ? new Date(editedTest.availabilityEnd) : null

    console.log("Validating dates:", { now, start, end }) // Debug log

    // Reset any previous error
    setSaveMessage(null)

    // Check if dates are provided
    if (!start || !end) {
      console.log("Missing dates") // Debug log
      setSaveMessage("Both start and end dates are required")
      return false
    }

    // Check if dates are in the future
    if (start < now) {
      console.log("Start date is in the past:", start, "vs", now) // Debug log
      const message = "Start date must be in the future"
      setSaveMessage(message)
      toast.error(message)
      return false
    }

    if (end < now) {
      console.log("End date is in the past:", end, "vs", now) // Debug log
      const message = "End date must be in the future"
      setSaveMessage(message)
      toast.error(message)
      return false
    }

    // Check if start date is before end date
    if (start >= end) {
      console.log("Start date is after end date:", start, "vs", end) // Debug log
      const message = "Start date must be before end date"
      setSaveMessage(message)
      toast.error(message)
      return false
    }

    // Check if duration makes sense with the time window
    const timeWindow = end.getTime() - start.getTime()
    const timeWindowInMinutes = timeWindow / (1000 * 60)
    if (editedTest.totalDuration && editedTest.totalDuration > timeWindowInMinutes) {
      console.log("Duration too long:", editedTest.totalDuration, "vs", timeWindowInMinutes) // Debug log
      setSaveMessage("Test duration cannot be longer than the available time window")
      return false
    }

    console.log("Date validation passed!") // Debug log
    return true
  }

  const updateTestDetails = async () => {
    console.log("updateTestDetails called") // Debug log
    
    if (!testId || !test) {
      console.log("Missing testId or test:", { testId, test }) // Debug log
      toast.error("Missing test ID or test data")
      return
    }

    console.log("editedTest:", editedTest) // Debug log

    // Validate dates before proceeding
    if (!validateDates()) {
      console.log("Date validation failed") // Debug log
      return
    }

    setIsUpdatingTest(true)
    setSaveMessage(null)

    try {
      // Merge existing test values with edited fields to ensure required fields are present
      const payload = {
        title: editedTest.title ?? test.title,
        description: editedTest.description ?? test.description,
        availabilityStart: editedTest.availabilityStart ?? test.availabilityStart,
        availabilityEnd: editedTest.availabilityEnd ?? test.availabilityEnd,
        totalDuration: editedTest.totalDuration ?? test.totalDuration,
        shuffleQuestions: editedTest.shuffleQuestions ?? test.shuffleQuestions,
        allowSectionNav: editedTest.allowSectionNav ?? test.allowSectionNav,
        negativeMarking: editedTest.negativeMarking ?? test.negativeMarking,
        showResultsInstant: editedTest.showResultsInstant ?? test.showResultsInstant,
        status: editedTest.status ?? test.status,
      }

      console.log("Sending payload:", payload) // Debug log

      const response = await fetch(`/api/test/${testId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      console.log("Response status:", response.status) // Debug log
      
      const data = await response.json()
      console.log("Response data:", data) // Debug log
      
      if (!response.ok) {
        setSaveMessage(data.message || "Failed to update test")
        toast.error(data.message || "Failed to update test")
        return
      }

      setTest(data.test)
      setIsEditingDetails(false)
      setSaveMessage("Test details updated successfully!")
      toast.success("Test details updated successfully!")
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error("Error in updateTestDetails:", err) // Debug log
      const message = err instanceof Error ? err.message : "Failed to update test"
      setSaveMessage(message)
      toast.error(message)
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsUpdatingTest(false)
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

      const data = await response.json()
      setTest(data.test)
      setLocalSections(data.test.sections || [])
      setSaveMessage("Changes saved successfully!")
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Failed to save changes")
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEditDetails = () => {
    if (test) {
      setEditedTest({
        title: test.title,
        description: test.description,
        availabilityStart: test.availabilityStart,
        availabilityEnd: test.availabilityEnd,
        totalDuration: test.totalDuration,
        shuffleQuestions: test.shuffleQuestions,
        allowSectionNav: test.allowSectionNav,
        negativeMarking: test.negativeMarking,
        showResultsInstant: test.showResultsInstant,
        status: test.status,
      })
    }
    setIsEditingDetails(false)
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



  const startEditingSection = (section: Section) => {
    setEditingSection(section.id)
    setEditedSectionTitle(section.title)
    setEditedSectionDuration(section.duration ?? "")
    setSectionMarksEdit({
      positiveMarks: section.defaultPositiveMarks ?? 1.0,
      negativeMarks: section.defaultNegativeMarks ?? 0.0
    })
  }

  const saveEditedSection = (sectionId: string) => {
    if (!editedSectionTitle.trim()) {
      toast.error("Please enter a section title")
      return
    }

    if (!editedSectionDuration) {
      toast.error("Please enter section duration in minutes")
      return
    }

    setLocalSections(localSections.map(section => 
      section.id === sectionId ? {
        ...section,
        title: editedSectionTitle,
        duration: Number(editedSectionDuration),
        defaultPositiveMarks: sectionMarksEdit.positiveMarks,
        defaultNegativeMarks: sectionMarksEdit.negativeMarks
      } : section
    ))

    setEditingSection(null)
    setEditedSectionTitle("")
    setEditedSectionDuration("")
    setSectionMarksEdit({ positiveMarks: 1.0, negativeMarks: 0.0 })
    toast.success("Section updated successfully!")
  }

  const cancelEditingSection = () => {
    setEditingSection(null)
    setEditedSectionTitle("")
    setEditedSectionDuration("")
    setSectionMarksEdit({ positiveMarks: 1.0, negativeMarks: 0.0 })
  }

  const cancelAddingQuestion = () => {
    // Reset form to initial state
    setNewQuestion({
      type: "mcq",
      text: "",
      correctAnswer: "",
      positiveMarks: null,
      negativeMarks: null,
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
    })
    setIsAddingQuestion(false)
    setSelectedSection(null)
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
    <div className="h-screen bg-white flex flex-col">
      {/* Compact Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/home")}
              className="p-1 hover:bg-gray-100 rounded-md shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-gray-900 truncate">{test.title}</h1>
            </div>
          </div>
          <div className="flex items-center">
            <Button onClick={saveChanges} disabled={isSaving} className="bg-gray-900 hover:bg-black text-white px-3 py-1 text-xs h-7">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Compact Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-gray-50/30 flex flex-col">
          <div className="p-3 overflow-y-auto">
            <nav className="space-y-0.5">
              <button
                onClick={() => setActiveView("details")}
                className={`w-full px-3 py-2 text-left rounded-md text-sm transition-colors ${
                  activeView === "details" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Test Details
              </button>

              <button
                onClick={() => setActiveView("sections")}
                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-md text-sm transition-colors ${
                  activeView === "sections" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>Sections</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">{localSections.length}</span>
              </button>

              {localSections.length > 0 && (
                <div className="mt-2 space-y-1">
                  {localSections.map((section, index) => (
                    <div key={section.id} className="ml-2">
                      <button
                        onClick={() => toggleSectionCollapse(section.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-left text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      >
                        <span className="truncate">{section.title}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{section.questions?.length || 0}</span>
                          {collapsedSections.has(section.id) ? (
                            <ChevronRight className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </button>

                      {!collapsedSections.has(section.id) && section.questions && section.questions.length > 0 && (
                        <div className="ml-3 mt-1 space-y-0.5">
                          {section.questions.map((question, qIndex) => (
                            <div 
                              key={question.id} 
                              className="px-2 py-0.5 text-xs text-gray-500 truncate hover:text-gray-700 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                              onClick={() => openEditQuestionModal(question)}
                              title="Click to edit question"
                            >
                              {qIndex + 1}. {question.text.replace(/<[^>]*>/g, '')}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-4 overflow-y-auto">
            {activeView === "details" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Test Configuration</h2>
                    <p className="text-xs text-gray-600">Manage your test settings and availability</p>
                    {/* {saveMessage && (
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        {saveMessage}
                      </div>
                    )} */}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingDetails ? (
                      <Button 
                        onClick={() => {
                          setEditedTest({
                            title: test.title,
                            description: test.description,
                            availabilityStart: test.availabilityStart,
                            availabilityEnd: test.availabilityEnd,
                            totalDuration: test.totalDuration,
                            shuffleQuestions: test.shuffleQuestions,
                            allowSectionNav: test.allowSectionNav,
                            negativeMarking: test.negativeMarking,
                            showResultsInstant: test.showResultsInstant
                          });
                          setIsEditingDetails(true);
                        }} 
                        variant="outline" 
                        className="border-black rounded-full hover:bg-gray-200 h-8 px-3 text-xs border-2"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit Details
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => {
                            console.log("Save Changes button clicked!"); // Debug log
                            console.log("isUpdatingTest:", isUpdatingTest); // Debug log
                            updateTestDetails();
                          }}
                          disabled={isUpdatingTest}
                          className="bg-gray-800 rounded-full hover:bg-black hover:cursor-pointer text-white h-8 px-4 text-xs"
                        >
                          {isUpdatingTest ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEditDetails}
                          disabled={isUpdatingTest}
                          className="border-gray-300 rounded-full bg-transparent h-8 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-l-4 border-gray-900 bg-gray-50/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="title" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Title
                      </Label>
                      {isEditingDetails ? (
                        <Input
                          id="title"
                          value={editedTest.title || ""}
                          onChange={(e) => setEditedTest({ ...editedTest, title: e.target.value })}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm font-medium">{test.title}</div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Description
                      </Label>
                      {isEditingDetails ? (
                        <Textarea
                          id="description"
                          value={editedTest.description || ""}
                          onChange={(e) => setEditedTest({ ...editedTest, description: e.target.value })}
                          placeholder="Enter test description..."
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 min-h-[60px] text-sm"
                        />
                      ) : (
                        <div className="text-gray-600 text-sm">
                          {test.description || "No description provided"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 bg-blue-50/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Timing & Availability</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="duration" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Duration (minutes)
                      </Label>
                      {isEditingDetails ? (
                        <Input
                          id="duration"
                          type="number"
                          min="1"
                          value={editedTest.totalDuration || ""}
                          onChange={(e) => {
                            const newDuration = Number.parseInt(e.target.value) || 0
                            setEditedTest({ ...editedTest, totalDuration: newDuration })

                            const availabilityStart = editedTest.availabilityStart
                              ? new Date(editedTest.availabilityStart)
                              : null
                            const availabilityEnd = editedTest.availabilityEnd
                              ? new Date(editedTest.availabilityEnd)
                              : null

                            // Validate duration against time window if dates are set
                            if (availabilityStart && availabilityEnd) {
                              const timeWindow = availabilityEnd.getTime() - availabilityStart.getTime()
                              const timeWindowInMinutes = timeWindow / (1000 * 60)
                              if (newDuration > timeWindowInMinutes) {
                                setSaveMessage("Test duration cannot be longer than the available time window")
                              } else if (newDuration <= 0) {
                                setSaveMessage("Test duration must be greater than 0")
                              } else {
                                setSaveMessage(null)
                              }
                            }
                          }}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm w-20"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm font-medium">
                          {test.totalDuration} minutes
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="startDate" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Start Date & Time
                      </Label>
                      {isEditingDetails ? (
                        <Input
                          id="startDate"
                          type="datetime-local"
                          min={new Date().toISOString().slice(0, 16)}
                          value={
                            editedTest.availabilityStart
                              ? new Date(editedTest.availabilityStart).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) => {
                            const newStart = e.target.value
                            setEditedTest({ ...editedTest, availabilityStart: newStart })

                            // Clear any validation messages since the browser prevents invalid dates
                            setSaveMessage(null)
                          }}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm min-w-48"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm font-medium">
                          {new Date(test.availabilityStart).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long', 
                            year: 'numeric'
                          })}, {new Date(test.availabilityStart).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="endDate" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        End Date & Time
                      </Label>
                      {isEditingDetails ? (
                        <Input
                          id="endDate"
                          type="datetime-local"
                          min={
                            editedTest.availabilityStart 
                              ? new Date(editedTest.availabilityStart).toISOString().slice(0, 16)
                              : new Date().toISOString().slice(0, 16)
                          }
                          value={
                            editedTest.availabilityEnd
                              ? new Date(editedTest.availabilityEnd).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={(e) => {
                            const newEnd = e.target.value
                            setEditedTest({ ...editedTest, availabilityEnd: newEnd })

                            // Clear any validation messages since the browser prevents invalid dates
                            setSaveMessage(null)
                          }}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm min-w-48"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm font-medium">
                          {new Date(test.availabilityEnd).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long', 
                            year: 'numeric'
                          })}, {new Date(test.availabilityEnd).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-green-500 bg-green-50/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Test Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Shuffle Questions</Label>
                        <p className="text-xs text-gray-500">Randomize question order</p>
                      </div>
                      {isEditingDetails ? (
                        <Switch
                          checked={editedTest.shuffleQuestions || false}
                          onCheckedChange={(checked) => setEditedTest({ ...editedTest, shuffleQuestions: checked })}
                        />
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${test.shuffleQuestions ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {test.shuffleQuestions ? "On" : "Off"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Section Navigation</Label>
                        <p className="text-xs text-gray-500">Allow navigation between sections</p>
                      </div>
                      {isEditingDetails ? (
                        <Switch
                          checked={editedTest.allowSectionNav !== false}
                          onCheckedChange={(checked) => setEditedTest({ ...editedTest, allowSectionNav: checked })}
                        />
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${test.allowSectionNav ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {test.allowSectionNav ? "On" : "Off"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Negative Marking</Label>
                        <p className="text-xs text-gray-500">Deduct points for wrong answers</p>
                      </div>
                      {isEditingDetails ? (
                        <Switch
                          checked={editedTest.negativeMarking || false}
                          onCheckedChange={(checked) => setEditedTest({ ...editedTest, negativeMarking: checked })}
                        />
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${test.negativeMarking ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {test.negativeMarking ? "On" : "Off"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 border border-gray-200 rounded">
                      <div>
                        <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Instant Results</Label>
                        <p className="text-xs text-gray-500">Show results after submission</p>
                      </div>
                      {isEditingDetails ? (
                        <Switch
                          checked={editedTest.showResultsInstant !== false}
                          onCheckedChange={(checked) => setEditedTest({ ...editedTest, showResultsInstant: checked })}
                        />
                      ) : (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${test.showResultsInstant ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
                        >
                          {test.showResultsInstant ? "On" : "Off"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === "sections" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Sections & Questions</h2>
                    <p className="text-xs text-gray-600">Organize your test content into structured sections</p>
                  </div>
                </div>

                {/* Add New Section Form */}
                <div className="border-l-4 border-green-500 bg-green-50/50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Section</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Label htmlFor="section-title" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Section Title
                        </Label>
                        <Input
                          id="section-title"
                          placeholder="Enter section title..."
                          value={newSectionTitle}
                          onChange={(e) => setNewSectionTitle(e.target.value)}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="section-duration" className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Duration (minutes)
                        </Label>
                        <Input
                          id="section-duration"
                          type="number"
                          placeholder="Duration"
                          value={newSectionDuration}
                          onChange={(e) => setNewSectionDuration(e.target.value ? Number(e.target.value) : "")}
                          className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                          min="1"
                        />
                      </div>
                    </div>
                    <div>
                      <Button
                        onClick={addSection}
                        className="bg-gray-800 rounded-full hover:bg-black hover:cursor-pointer text-white h-8 px-4 text-xs"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                </div>

                {localSections.length > 0 ? (
                  <div className="space-y-6">
                    {localSections.map((section, index) => (
                      <div key={section.id} className="border-l-4 border-purple-500 bg-purple-50/50 px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-900 text-white rounded-md flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              {editingSection === section.id ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        Section Title
                                      </Label>
                                      <Input
                                        value={editedSectionTitle}
                                        onChange={(e) => setEditedSectionTitle(e.target.value)}
                                        className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                                        placeholder="Section title"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        Duration (min)
                                      </Label>
                                      <Input
                                        type="number"
                                        value={editedSectionDuration}
                                        onChange={(e) => setEditedSectionDuration(e.target.value ? Number(e.target.value) : "")}
                                        className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                                        placeholder="Duration"
                                        min="1"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        Positive Marks
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={sectionMarksEdit.positiveMarks}
                                        onChange={(e) => setSectionMarksEdit({
                                          ...sectionMarksEdit,
                                          positiveMarks: parseFloat(e.target.value) || 0
                                        })}
                                        className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                        Negative Marks
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={sectionMarksEdit.negativeMarks}
                                        onChange={(e) => setSectionMarksEdit({
                                          ...sectionMarksEdit,
                                          negativeMarks: parseFloat(e.target.value) || 0
                                        })}
                                        className="border-gray-300 focus:border-gray-900 focus:ring-0 h-8 text-sm mt-1"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => saveEditedSection(section.id)}
                                      className="bg-gray-800 rounded-full hover:bg-black hover:cursor-pointer text-white h-8 px-4 text-xs"
                                    >
                                      Save Changes
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditingSection}
                                      className="border-gray-300 rounded-full bg-transparent h-8 px-3 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                                  <p className="text-xs text-gray-600">
                                    {section.questions?.length || 0} questions
                                    {section.duration && (
                                      <span className="text-purple-600"> • {section.duration} min</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Default: +{section.defaultPositiveMarks ?? 1.0} / -{section.defaultNegativeMarks ?? 0.0} marks
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditingSection(section)}
                              className="border-black rounded-full hover:bg-gray-200 h-8 px-3 text-xs border-2"
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSection(section.id)
                                setIsQuestionModalOpen(true)
                              }}
                              className="border-green-500 h-8 px-3 text-xs text-green-500 hover:text-green-600 hover:bg-green-50 border-2 rounded-full"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Question
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteSectionModal(section.id, section.title)}
                              className="text-red-600 border-2 border-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs rounded-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>



                        {section.questions?.length ? (
                          <div className="border-l- border-blue-500 bg-blue-50/50 px-4 py-3 mt-3">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Questions ({section.questions.length})</h4>
                            <div className="space-y-3">
                              {section.questions.map((question, qIndex) => (
                                <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer group" onClick={() => openEditQuestionModal(question)} title="Click to edit question">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="w-5 h-5 bg-gray-100 text-gray-700 rounded flex items-center justify-center text-xs font-medium mt-0.5">
                                        {qIndex + 1}
                                      </div>
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900 mb-1 flex items-start gap-2">
                                          <HtmlContent content={question.text} />
                                          <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                                            {question.type.toUpperCase()}
                                          </div>
                                          <div className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                                            +{question.positiveMarks ?? section.defaultPositiveMarks ?? 1.0} / -{question.negativeMarks ?? section.defaultNegativeMarks ?? 0.0}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openDeleteQuestionModal(section.id, question.id, question.text)
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  {question.options && (
                                    <div className="space-y-1 ml-8">
                                      {question.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                          <div
                                            className={`w-2 h-2 rounded-full ${option.isCorrect ? "bg-gray-900" : "bg-gray-300"}`}
                                          />
                                          <span
                                            className={`text-xs ${option.isCorrect ? "text-gray-900 font-medium" : "text-gray-600"}`}
                                          >
                                            {option.text}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {question.type === "text" && question.correctAnswer && (
                                    <div className="ml-8 mt-1">
                                      <div className="inline-flex items-center gap-2 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        <span className="font-medium">Correct: {question.correctAnswer}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="border-l-4 border-gray-300 bg-gray-50/50 px-4 py-6 mt-3">
                            <div className="text-center">
                              <h4 className="text-sm font-medium text-gray-600">No questions added yet</h4>
                              <p className="text-xs text-gray-500 mt-1">Click "Add Question" to get started</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-l-4 border-gray-300 bg-gray-50/50 px-4 py-6">
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-gray-600">No sections added yet</h4>
                      <p className="text-xs text-gray-500 mt-1">Create your first section to organize questions</p>
                    </div>
                  </div>
                )}


              </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Question Modal */}
      <QuestionModal
        key={editingQuestion?.id || 'new-question'}
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false)
          setSelectedSection(null)
          setEditingQuestion(null)
        }}
        onSave={(questionData) => {
          if (!selectedSection || !questionData.text.trim()) return
          if (questionData.type === "text" && !questionData.correctAnswer.trim()) return

          if (editingQuestion) {
            // Update existing question
            const updatedQuestion: Question = {
              ...editingQuestion,
              type: questionData.type,
              text: questionData.text,
              correctAnswer: questionData.type === "text" ? questionData.correctAnswer : null,
              positiveMarks: questionData.positiveMarks,
              negativeMarks: questionData.negativeMarks,
              options:
                questionData.type !== "text"
                  ? questionData.options
                      .filter((opt) => opt.text.trim())
                      .map((opt, index) => ({
                        id: opt.id || `temp-opt-${Date.now()}-${index}`,
                        text: opt.text,
                        isCorrect: opt.isCorrect,
                        questionId: editingQuestion.id,
                      }))
                  : undefined,
            }

            setLocalSections(
              localSections.map((section) =>
                section.id === selectedSection 
                  ? { 
                      ...section, 
                      questions: section.questions?.map(q => 
                        q.id === editingQuestion.id ? updatedQuestion : q
                      ) || []
                    } 
                  : section,
              ),
            )
          } else {
            // Add new question
            const question: Question = {
              id: `temp-q-${Date.now()}`,
              type: questionData.type,
              text: questionData.text,
              correctAnswer: questionData.type === "text" ? questionData.correctAnswer : null,
              positiveMarks: questionData.positiveMarks,
              negativeMarks: questionData.negativeMarks,
              sectionId: selectedSection,
              options:
                questionData.type !== "text"
                  ? questionData.options
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
          }

          setIsQuestionModalOpen(false)
          setSelectedSection(null)
          setEditingQuestion(null)
        }}
        section={selectedSection ? (localSections.find(s => s.id === selectedSection) as any) || null : null}
        initialQuestion={editingQuestion ? {
          type: editingQuestion.type,
          text: editingQuestion.text,
          options: editingQuestion.options?.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            id: opt.id
          })) || [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false }
          ],
          correctAnswer: editingQuestion.correctAnswer || "",
          positiveMarks: editingQuestion.positiveMarks ?? null,
          negativeMarks: editingQuestion.negativeMarks ?? null
        } : undefined}
        isLoading={isSaving}
      />
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'section', id: '', title: '', isDeleting: false })}
        onConfirm={() => {
          if (deleteModal.type === 'section') {
            deleteSection(deleteModal.id)
          } else {
            deleteQuestion(deleteModal.sectionId!, deleteModal.id)
          }
        }}
        title={`Delete ${deleteModal.type === 'section' ? 'Section' : 'Question'}`}
        message={`Are you sure you want to delete ${deleteModal.type === 'section' ? 'this section' : 'this question'}? ${deleteModal.type === 'section' ? 'All questions within this section will also be deleted.' : ''} This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteModal.isDeleting}
        variant="danger"
        icon={<AlertTriangle className="w-5 h-5" />}
      />
    </div>
  )
}
