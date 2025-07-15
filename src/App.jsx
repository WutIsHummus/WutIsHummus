import { useState, useRef } from "react";
import Initalheader from "./Parts/initalheader";
import Dither from "./blocks/Backgrounds/Dither/Dither";
import FuzzyText from "./blocks/TextAnimations/FuzzyText/FuzzyText";
import MainMenu from "./Parts/mainmenu"; 

const mainMenuBlobs = [
  { cx: -0.2, cy: 0.15, rx: 0.099, ry: 0.037 },
  { cx: -0.3, cy: 0.05, rx: 0.1, ry: 0.037 },
  { cx: -0.3, cy: -0.05, rx: 0.1, ry: 0.037 },
  { cx: -0.2, cy: -0.15, rx: 0.099, ry: 0.037 },
  { cx: 0.2, cy: 0, rx: 0.17, ry: 0.17},
];

export default function Portfolio() {
  const [showHeader, setShowHeader] = useState(true);
  const [activeBlobs, setActiveBlobs] = useState([])
  const [headerDisintegrated, setHeaderDisintegrated] = useState(false);
  const [arrowVisible, setArrowVisible] = useState(true);
  const [arrowUp, setArrowUp] = useState(false);
  const disintegrateRef = useRef();

  const handleArrowClick = () => {
    if (!headerDisintegrated) {
      setArrowVisible(false);
      disintegrateRef.current?.disintegrate();
    } else {
      setArrowVisible(false);
      setTimeout(() => {
        setShowHeader(true);
        setArrowUp(false);
        setTimeout(() => {
          setHeaderDisintegrated(false);
          setArrowVisible(true);
        }, 350);
      }, 350);
    }
  };

  const handleHeaderGone = () => {
    setShowHeader(false);
    setActiveBlobs(mainMenuBlobs)
    setHeaderDisintegrated(true);
    setArrowUp(true);
    setTimeout(() => {
      setArrowVisible(true);
    }, 350);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col">
      <div className="absolute inset-0 -z-10">
        <Dither
          waveColor={[0.75, 0.1, 0.1]}
          disableAnimation={false}
          enableMouseInteraction={false}
          colorNum={10}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.02}
          blobsActive={!showHeader}
          blobs={activeBlobs}
      
        />
      </div>

      {showHeader ? (
        <Initalheader
          disintegrateRef={disintegrateRef}
          onArrowClick={handleHeaderGone}
        />
      ) : (
       <MainMenu isVisible={headerDisintegrated} menuBlobs={activeBlobs} />
      )}

      <div
        className={`absolute left-1/2 -translate-x-1/2 transition-all duration-700`}
        style={{
          bottom: arrowUp ? "90vh" : "5vh",
          opacity: arrowVisible ? 1 : 0,
          pointerEvents: arrowVisible ? "auto" : "none",
          transition: "opacity 0.35s, bottom 0.7s, transform 0.35s"
        }}
      >
        <button
          onClick={handleArrowClick}
          aria-label={arrowUp ? "Show header" : "Hide header"}
          className="transition-transform focus:outline-none bg-transparent border-none p-0"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            transition: "transform 0.35s"
          }}
        >
          <FuzzyText
            fontSize={54}
            baseIntensity={0.12}
            hoverIntensity={0.5}
            color="#ba3f30"
            strokeColor="#151515"
            strokeWidth={5}
            enableHover={true}
          >
            {arrowUp ? "˄" : "˅"}
          </FuzzyText>
        </button>
      </div>
    </main>
  );
}
