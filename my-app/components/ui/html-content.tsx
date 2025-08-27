"use client"

import React from 'react'
import DOMPurify from 'isomorphic-dompurify'

interface HtmlContentProps {
  content: string
  className?: string
}

export function HtmlContent({ content, className = '' }: HtmlContentProps) {
  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 
      'img', 'math', 'mfrac', 'mi', 'mo', 'mn', 'msup', 'msub', 'mrow'
    ],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'xmlns', 'style'],
    ALLOW_DATA_ATTR: false,
  })

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}
