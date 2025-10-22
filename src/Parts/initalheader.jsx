import { useState, useEffect } from "react";
import FuzzyText from "../blocks/TextAnimations/FuzzyText/FuzzyText";
import Disintegrate from "../blocks/Animations/Disintegrate/Disintegrate";
import ASCIIText from "../blocks/TextAnimations/ASCIIText/ASCIIText";

export default function Initalheader({ disintegrateRef, onArrowClick }) {
  const [showContent, setShowContent] = useState(false);
  const [fontSize, setFontSize] = useState(32);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleResize() {
      const width = window.visualViewport?.width || window.innerWidth;
      setFontSize(Math.min(25, width / 25));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
      <Disintegrate ref={disintegrateRef} onDisintegrated={onArrowClick}>
        <div className={`transition-all duration-1000 ${showContent ? "opacity-100 " : "opacity-0 "} z-30`}>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-full max-w-5xl h-[30vh]">
              <ASCIIText
                text="Alpeeenn"
                enableWaves={true}
                asciiFontSize={4}
                planeBaseHeight={30}
              />
            </div>
            <div
              className="w-full flex justify-center"
              style={{ minHeight: fontSize * 1.35 }}
            >
              <FuzzyText
                baseIntensity={0.1}
                hoverIntensity={0.2}
                color="#e663e6ff"
                strokeColor="#151515"
                strokeWidth={6}
                fontSize={fontSize}
              >
                CS @ UT | FullStack @ LM | Roblox Dev | VCAT @ Long Horn Racing
              </FuzzyText>
            </div>
          </div>
        </div>
      </Disintegrate>
    </div>
  );
}
