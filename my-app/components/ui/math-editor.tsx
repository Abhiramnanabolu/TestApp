"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { X } from "lucide-react";

// Importing the element upgrades the <math-field> custom element
import "mathlive";

// Type declaration for math-field custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": any;
    }
  }
}

interface MathEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (mathHtml: string) => void;
}

export function MathEditorModal({ isOpen, onClose, onInsert }: MathEditorModalProps) {
  const fieldRef = useRef<HTMLElement | null>(null);
  const [latex, setLatex] = useState("");
  const [mathml, setMathml] = useState("");
  const [htmlOut, setHtmlOut] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLatex("");
      setMathml("");
      setHtmlOut("");
      // Clear the math field
      if (fieldRef.current) {
        (fieldRef.current as any).value = "";
      }
    }
  }, [isOpen]);

  // Capture LaTeX as user types
  useEffect(() => {
    const el = fieldRef.current as any;
    if (!el) return;

    const handleInput = () => {
      // MathLive's value is LaTeX
      const currentLatex = el.value ?? "";
      setLatex(currentLatex);

      // Ask MathLive for MathML directly
      try {
        const mml = el.getValue?.("math-ml") ?? "";
        setMathml(mml);
      } catch {
        setMathml("");
      }
    };

    el.addEventListener("input", handleInput);
    return () => el.removeEventListener("input", handleInput);
  }, [isOpen]);

  // Convert LaTeX -> HTML+MathML using KaTeX in-browser
  useEffect(() => {
    (async () => {
      if (!latex) {
        setHtmlOut("");
        return;
      }
      // Import KaTeX only when needed to keep the bundle smaller
      try {
        const katex = await import("katex");
        const html = katex.renderToString(latex, {
          throwOnError: false,
          output: "htmlAndMathml", // gives an HTML tree with embedded <math> annotation
          displayMode: true,
        });
        setHtmlOut(html);
      } catch {
        setHtmlOut("");
      }
    })();
  }, [latex]);

  const handleInsert = () => {
    if (latex.trim()) {
      // Insert LaTeX - TipTap Mathematics extension will render it
      onInsert(latex);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold">Insert Math Equation</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Math Input (use the toolbar or keyboard to create equations):
              </label>
              {React.createElement('math-field', {
                ref: fieldRef,
                className: "block w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500",
                defaultmode: "math",
                smartmode: true,
                virtualkeyboardmode: "onfocus",
                style: { minHeight: 80 }
              })}
            </div>

            <div className="space-y-3 mt-4">
              <div className="text-sm text-gray-600">
                <p>Use the math editor above to create equations. The equation will be inserted directly into your question text.</p>
              </div>
              
              {latex && (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">LaTeX:</span>
                    <code className="block bg-gray-100 px-3 py-2 rounded text-sm mt-1 font-mono">{latex}</code>
                  </div>
                  
                  {htmlOut && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Preview:</span>
                      <div className="border border-gray-200 rounded p-3 bg-white mt-1 text-center">
                        <div
                          dangerouslySetInnerHTML={{ __html: htmlOut }}
                          aria-label="Math equation preview"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-6 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            disabled={!latex.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Insert Equation
          </Button>
        </div>
      </div>
    </div>
  );
}
