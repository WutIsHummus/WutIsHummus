import React, { useRef, useEffect, useState } from "react";
import FuzzyText from "../blocks/TextAnimations/FuzzyText/FuzzyText";

interface Blob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  label: string;
}

interface PositionedBlob {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

interface MainMenuProps {
  isVisible: boolean;
  menuBlobs: Blob[];
}

export default function MainMenu({ isVisible, menuBlobs }: MainMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [blobs, setBlobs] = useState<PositionedBlob[]>([]);
  const [fontSize, setFontSize] = useState(100);
  const [showContent, setShowContent] = useState(false);

  // fade in menu
  useEffect(() => {
    const id = setTimeout(() => setShowContent(true), 1000);
    return () => clearTimeout(id);
  }, []);

  // compute positions & sizes
  useEffect(() => {
    function calc() {
      if (!ref.current) return;
      const { width: w, height: h } = ref.current.getBoundingClientRect();
      setBlobs(
        menuBlobs.map(b => ({
          x: (b.cx + 0.5) * w,
          y: h / 2 + b.cy * w,
          width: b.rx * 2 * w,
          height: b.ry * 2 * w,
          label: b.label,
        }))
      );
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [menuBlobs]);

  // responsive font size
  useEffect(() => {
    function onResize() {
      const width = window.visualViewport?.width ?? window.innerWidth;
      setFontSize(Math.min(25, width / 25));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={`transition-opacity duration-500 ${showContent ? "opacity-100" : "opacity-0"}`}>
      <div ref={ref} className="relative w-full h-screen overflow-hidden">
        {isVisible &&
          blobs.map((b, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: b.x,
                top: b.y,
                width: b.width,
                height: b.height,
                transform: "translate(-50%, -50%)",
                clipPath: "ellipse(50% 50% at 50% 50%)",
                WebkitClipPath: "ellipse(50% 50% at 50% 50%)",
                overflow: "hidden",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center hover:cursor-pointer">
                <FuzzyText
                  baseIntensity={0.1}
                  hoverIntensity={0.2}
                  color="#dc3f2aff"
                  strokeColor="#151515"
                  strokeWidth={6}
                  fontSize={fontSize}
                >
                  {b.label}
                </FuzzyText>
              </div>

            </div>
          ))}
      </div>
    </div>
  );
}
