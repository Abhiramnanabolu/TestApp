"use client";

import React, { useEffect, useRef, useState } from "react";
// Importing the element upgrades the <math-field> custom element
import "mathlive";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        readonly?: boolean;
        defaultmode?: "math" | "text";
        smartmode?: boolean;
        virtualkeyboardmode?: "manual" | "onfocus" | "off" | "hidden";
      };
    }
  }
}

export default function MathEditor() {
  const fieldRef = useRef<HTMLElement | null>(null);
  const [latex, setLatex] = useState("");
  const [mathml, setMathml] = useState("");
  const [htmlOut, setHtmlOut] = useState("");

  // capture LaTeX as user types
  useEffect(() => {
    const el = fieldRef.current as any;
    if (!el) return;

    const handleInput = () => {
      // MathLive’s value is LaTeX
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
  }, []);

  // Convert LaTeX -> HTML+MathML using KaTeX in-browser (optional)
  useEffect(() => {
    (async () => {
      if (!latex) {
        setHtmlOut("");
        return;
      }
      // Import KaTeX only when needed to keep the bundle smaller
      const katex = await import("katex");
      try {
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Math Editor</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-medium text-blue-900 mb-2">Integration Complete!</h2>
        <p className="text-blue-800">
          This MathLive editor has been integrated into your question creation modal. 
          You can now create math equations in questions using the Type (𝑓) button in the rich text editor toolbar.
        </p>
      </div>

      <math-field
        ref={fieldRef as any}
        className="block w-full rounded-xl border p-3"
        defaultmode="math"
        smartmode
        virtualkeyboardmode="onfocus"
        style={{ minHeight: 56 }}
        // You can set a starter value if you want:
        // dangerouslySetInnerHTML={{ __html: "" }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-medium">LaTeX</h2>
          <textarea
            className="w-full h-32 rounded-md border p-2"
            readOnly
            value={latex}
          />
        </section>

        <section className="space-y-2">
          <h2 className="font-medium">MathML (from MathLive)</h2>
          <textarea
            className="w-full h-32 rounded-md border p-2"
            readOnly
            value={mathml}
          />
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">HTML+MathML (KaTeX render)</h2>
        <div className="rounded-md border p-3 overflow-auto">
          {/* Render the KaTeX HTML safely */}
          <div
            dangerouslySetInnerHTML={{ __html: htmlOut }}
            aria-label="Rendered formula"
          />
        </div>
        <details>
          <summary className="cursor-pointer">View raw HTML</summary>
          <textarea className="w-full h-40 rounded-md border p-2" readOnly value={htmlOut} />
        </details>
      </section>
    </div>
  );
}
