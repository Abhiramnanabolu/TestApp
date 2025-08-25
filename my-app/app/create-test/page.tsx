"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

export default function CreateTest() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [availabilityStart, setAvailabilityStart] = useState("")
  const [availabilityEnd, setAvailabilityEnd] = useState("")
  const [totalDuration, setTotalDuration] = useState<number | "">("")
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [allowSectionNav, setAllowSectionNav] = useState(true)
  const [negativeMarking, setNegativeMarking] = useState(false)
  const [showResultsInstant, setShowResultsInstant] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (status === "unauthenticated") {
    redirect("/api/auth/signin")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    const payload = {
      title,
      description,
      availabilityStart: new Date(availabilityStart).toISOString(),
      availabilityEnd: new Date(availabilityEnd).toISOString(),
      totalDuration: typeof totalDuration === "number" ? totalDuration : Number(totalDuration),
      shuffleQuestions,
      allowSectionNav,
      negativeMarking,
      showResultsInstant
    }

    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      })
      const data = await res.json()
      if (res.ok) {
        setMessage("Test created successfully")
        router.push("/create-test/"+data.test.id)
      } else {
        setMessage(data?.message ?? "Failed to create test")
      }
    } catch (err) {
      setMessage("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setAvailabilityStart("")
    setAvailabilityEnd("")
    setTotalDuration("")
    setShuffleQuestions(false)
    setAllowSectionNav(true)
    setNegativeMarking(false)
    setShowResultsInstant(true)
    setMessage(null)
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-semibold text-gray-900">Create Test</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Set up a new test with custom settings and availability</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                    Title
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter test title"
                    required
                    className="border-gray-200 focus:border-gray-400 focus:ring-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter test description (optional)"
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 min-h-[80px]"
                  />
                </div>
              </div>

              {/* Availability Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Availability</h3>
                  <p className="text-xs text-gray-500">Can be changed anytime</p>
                </div>
                <div className="border-b border-gray-100 pb-2"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start" className="text-sm font-medium text-gray-700">
                      Start Date & Time
                    </Label>
                    <Input
                      id="start"
                      type="datetime-local"
                      value={availabilityStart}
                      onChange={(e) => setAvailabilityStart(e.target.value)}
                      required
                      className="border-gray-200 focus:border-gray-400 focus:ring-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end" className="text-sm font-medium text-gray-700">
                      End Date & Time
                    </Label>
                    <Input
                      id="end"
                      type="datetime-local"
                      value={availabilityEnd}
                      onChange={(e) => setAvailabilityEnd(e.target.value)}
                      required
                      className="border-gray-200 focus:border-gray-400 focus:ring-0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                    Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={0}
                    value={totalDuration as any}
                    onChange={(e) => setTotalDuration(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Enter duration in minutes"
                    required
                    className="border-gray-200 focus:border-gray-400 focus:ring-0 max-w-xs"
                  />
                </div>
              </div>

              {/* Test Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-2">Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-700">Shuffle Questions</Label>
                      <p className="text-xs text-gray-500">Randomize question order for each attempt</p>
                    </div>
                    <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-700">Allow Section Navigation</Label>
                      <p className="text-xs text-gray-500">Let students navigate between sections</p>
                    </div>
                    <Switch checked={allowSectionNav} onCheckedChange={setAllowSectionNav} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-700">Negative Marking</Label>
                      <p className="text-xs text-gray-500">Deduct points for incorrect answers</p>
                    </div>
                    <Switch checked={negativeMarking} onCheckedChange={setNegativeMarking} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-gray-700">Show Results Instantly</Label>
                      <p className="text-xs text-gray-500">Display results immediately after submission</p>
                    </div>
                    <Switch checked={showResultsInstant} onCheckedChange={setShowResultsInstant} />
                  </div>
                </div>
              </div>

              {/* Message */}
              {message && (
                <Alert
                  className={
                    message.includes("successfully") ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                  }
                >
                  <AlertDescription className={message.includes("successfully") ? "text-green-800" : "text-red-800"}>
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button type="submit" disabled={submitting} className="bg-gray-900 hover:bg-gray-800 text-white px-6">
                  {submitting ? "Creating..." : "Create Test"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent"
                />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
