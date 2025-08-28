"use client"

import React, { useMemo } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import katex from 'katex'

interface HtmlContentProps {
  content: string
  className?: string
}

export function HtmlContent({ content, className = '' }: HtmlContentProps) {
  // Convert LaTeX delimiters ($...$, $$...$$) and extension nodes to KaTeX HTML before sanitizing/printing
  const rendered = useMemo(() => {
    if (!content) return ''

    // 1) Start with a DOM-based transformation so attribute order doesn't matter
    const container = document.createElement('div')
    container.innerHTML = content

    // Replace inline math nodes
    container.querySelectorAll('[data-type="inline-math"]').forEach(el => {
      const latex = (el as HTMLElement).getAttribute('data-latex') || ''
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          output: 'htmlAndMathml',
          displayMode: false,
        })
        el.outerHTML = html
      } catch {
        // leave as-is on error
      }
    })

    // Replace block math nodes
    container.querySelectorAll('[data-type="block-math"]').forEach(el => {
      const latex = (el as HTMLElement).getAttribute('data-latex') || ''
      try {
        const html = katex.renderToString(latex, {
          throwOnError: false,
          output: 'htmlAndMathml',
          displayMode: true,
        })
        el.outerHTML = html
      } catch {
        // leave as-is on error
      }
    })

    let transformed = container.innerHTML

    // 2) Also support raw $...$ and $$...$$ that might exist in saved content
    transformed = transformed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, expr) => {
      try {
        return katex.renderToString(String(expr), {
          throwOnError: false,
          output: 'htmlAndMathml',
          displayMode: true,
        })
      } catch {
        return _match
      }
    })

    transformed = transformed.replace(/\$([^$]+?)\$/g, (_match, expr) => {
      try {
        return katex.renderToString(String(expr), {
          throwOnError: false,
          output: 'htmlAndMathml',
          displayMode: false,
        })
      } catch {
        return _match
      }
    })

    return transformed
  }, [content])

  // Sanitize the HTML content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(rendered, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 
      'img', 'span', 'div',
      // MathML tags
      'math', 'mfrac', 'mi', 'mo', 'mn', 'msup', 'msub', 'mrow', 'msqrt', 'mroot',
      'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mspace', 'mtext',
      'mpadded', 'mphantom', 'mfenced', 'menclose', 'mlabeledtr', 'maligngroup',
      'malignmark', 'maction', 'semantics', 'annotation', 'annotation-xml'
    ],
    ALLOWED_ATTR: [
      'src', 'alt', 'class', 'xmlns', 'style', 'width', 'height', 'aria-hidden', 'role',
      // MathML attributes
      'mathvariant', 'mathsize', 'mathcolor', 'mathbackground', 'form', 'fence',
      'separator', 'lspace', 'rspace', 'stretchy', 'symmetric', 'maxsize', 'minsize',
      'largeop', 'movablelimits', 'accent', 'linebreak', 'lineleading', 'linebreakstyle',
      'linebreakmultchar', 'indentalign', 'indentshift', 'indenttarget', 'indentalignfirst',
      'indentshiftfirst', 'indentalignlast', 'indentshiftlast', 'depth', 'height',
      'displaystyle', 'scriptlevel', 'scriptsizemultiplier', 'scriptminsize', 'background',
      'veryverythinmathspace', 'verythinmathspace', 'thinmathspace', 'mediummathspace',
      'thickmathspace', 'verythickmathspace', 'veryverythickmathspace', 'negativeveryverythinmathspace',
      'negativeverythinmathspace', 'negativethinmathspace', 'negativemediummathspace',
      'negativethickmathspace', 'negativeverythickmathspace', 'negativeveryverythickmathspace'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^data:image\/(png|jpg|jpeg|gif|svg\+xml|webp);base64,/
  })

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}
