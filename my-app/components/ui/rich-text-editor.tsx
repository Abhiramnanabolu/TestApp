"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mathematics from '@tiptap/extension-mathematics'
import { Bold } from '@tiptap/extension-bold'
import { Italic } from '@tiptap/extension-italic'
import { Underline } from '@tiptap/extension-underline'
import { BulletList } from '@tiptap/extension-bullet-list'
import { OrderedList } from '@tiptap/extension-ordered-list'
import { ListItem } from '@tiptap/extension-list-item'
import { Button } from './button'
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Image as ImageIcon,
  Type
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import { MathEditorModal } from './math-editor'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showMathModal, setShowMathModal] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-outside ml-2',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-2',
        },
      }),
      ListItem,
      Image.configure({
        // Ensure images with data URIs from saved content render in the editor
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          output: 'htmlAndMathml',
          displayMode: false,
        },
      }),
    ],
    content,
    // Avoid SSR hydration mismatches per Tiptap guidance
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[80px] p-2 text-sm leading-relaxed',
      },
      handleDOMEvents: {
        // Force math re-rendering on focus/blur
        focus: (view) => {
          setTimeout(() => view.updateState(view.state), 0)
          return false
        },
      },
    },
  })

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.currentTarget
    const file = inputEl.files?.[0]
    if (!file) return

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (editor) {
        editor.chain().focus().setImage({ src: base64 }).run()
      }
      // reset the input so selecting the same file again triggers onChange
      inputEl.value = ''
    }
    reader.readAsDataURL(file)
  }, [editor])

  const handleImagePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        const reader = new FileReader()
        reader.onload = (e) => {
          const base64 = e.target?.result as string
          if (editor) {
            editor.chain().focus().setImage({ src: base64 }).run()
          }
        }
        reader.readAsDataURL(file)
        break
      }
    }
  }, [editor])

  // Add paste event listener for images
  React.useEffect(() => {
    const editorElement = editor?.view.dom
    if (editorElement) {
      editorElement.addEventListener('paste', handleImagePaste as EventListener)
      return () => {
        editorElement.removeEventListener('paste', handleImagePaste as EventListener)
      }
    }
  }, [editor, handleImagePaste])

  const insertMath = () => {
    setShowMathModal(true)
  }

  const handleMathInsert = (latex: string) => {
    if (!editor) return
    const trimmedLatex = (latex || '').trim()
    if (!trimmedLatex) return

    // Use the Mathematics extension command to insert an inline math node
    ;(editor.chain() as any)
      .focus()
      .insertInlineMath({ latex: trimmedLatex })
      .run()
  }

  if (!editor) {
    return <div className="min-h-[60px] border border-gray-300 rounded-lg animate-pulse bg-gray-50" />
  }

  return (
    <div className={`border border-gray-300 rounded-lg focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-1 border-b border-gray-200 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 h-6 w-6 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          <BoldIcon className="h-3 w-3" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 h-6 w-6 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          <ItalicIcon className="h-3 w-3" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 h-6 w-6 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
        >
          <UnderlineIcon className="h-3 w-3" />
        </Button>

        <div className="w-px h-4 bg-gray-300 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 h-6 w-6 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        >
          <List className="h-3 w-3" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 h-6 w-6 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        >
          <ListOrdered className="h-3 w-3" />
        </Button>

        <div className="w-px h-4 bg-gray-300 mx-0.5" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="p-1 h-6 w-6"
        >
          <ImageIcon className="h-3 w-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertMath}
          className="p-1 h-6 w-6"
        >
          <Type className="h-3 w-3" />
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="min-h-[60px]"
        placeholder={placeholder}
      />

      {/* Math Modal */}
      <MathEditorModal
        isOpen={showMathModal}
        onClose={() => setShowMathModal(false)}
        onInsert={handleMathInsert}
      />
    </div>
  )
}
