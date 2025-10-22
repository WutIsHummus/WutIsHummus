import React, { useState, useRef } from "react";
import Initalheader from "./Parts/initalheader";
import Dither from "./blocks/Backgrounds/Dither/Dither";
import FuzzyText from "./blocks/TextAnimations/FuzzyText/FuzzyText";
import MainMenu from "./Parts/mainmenu";
import EndHeader from "./Parts/endheader";

const FADE_DURATION = 500; // must match the fade duration used inside MainMenu

const mainMenuBlobs = [
  { cx: -0.2, cy: 0.15, rx: 0.13, ry: 0.045, label: "TECH STACK" },
  { cx: -0.3, cy: 0.05, rx: 0.11, ry: 0.042, label: "PROJECTS" },
  { cx: -0.3, cy: -0.05, rx: 0.13, ry: 0.042, label: "EXPERIENCE" },
  { cx: -0.2, cy: -0.15, rx: 0.09, ry: 0.042, label: "ABOUT" },
  { cx: 0.2, cy: 0, rx: 0.17, ry: 0.17, label: "" },
];

export default function App() {
  // Stage flags
  const [showHeader, setShowHeader] = useState(true);        // Initial header shown?
  const [showEnd, setShowEnd] = useState(false);             // End header shown?

  const [displayedBlobs, setDisplayedBlobs] = useState(mainMenuBlobs);

  // Drives MainMenu fade in/out (true -> fade in, false -> fade out)
  const [headerDisintegrated, setHeaderDisintegrated] = useState(false);

  // For background blobs and general UX (doesn't control rendering of MainMenu)
  const [showMenu, setShowMenu] = useState(false);

  // Up/Down arrows visibility
  const [arrowVisible, setArrowVisible] = useState(true);

  // Reference to trigger the initial header's disintegrate animation
  const disintegrateRef = useRef(null);

  // Called by the Initial header when user presses the arrow (or when disintegrate finishes)
  const handleHeaderGone = () => {
    setShowHeader(false);
    setShowEnd(false);
    setShowMenu(true);

    // ensure blobs are present before we ask them to grow
    setDisplayedBlobs(mainMenuBlobs);

    setHeaderDisintegrated(true); // MainMenu fade-in
    setTimeout(() => setArrowVisible(true), 350);
  };

  // Down navigation: Initial → Menu → End
  const handleDownClick = () => {
    setArrowVisible(false);

    // If Initial header is present, trigger its disintegrate
    if (showHeader && !headerDisintegrated) {
      disintegrateRef.current?.disintegrate?.();
      return;
    }

    // If we're on MainMenu, fade it OUT first, then show EndHeader
    if (!showHeader && !showEnd) {
      setHeaderDisintegrated(false); // tells shader to fade out
      // keep displayedBlobs intact during the fade, then clear:
      setTimeout(() => {
        setShowEnd(true);
        setShowMenu(false);
        setDisplayedBlobs([]);          // <-- clear AFTER fade completes
        setTimeout(() => setArrowVisible(true), 350);
      }, FADE_DURATION);
      return;
    }

    // If already at End header, you can loop or do nothing
  };

  // Up navigation: End → Menu → Initial
  const handleUpClick = () => {
    setArrowVisible(false);

    // If we're at EndHeader -> go back to MainMenu (fade IN)
    if (showEnd) {
      setShowEnd(false);
      setShowMenu(true);

      // feed blobs first so the grow animation has geometry to scale
      setDisplayedBlobs(mainMenuBlobs);

      // next tick: flip the grow flag
      setTimeout(() => {
        setHeaderDisintegrated(true);
        setTimeout(() => setArrowVisible(true), 350);
      }, 0);
      return;
    }

    // If we're on MainMenu -> go back to Initial header (fade OUT first)
    if (!showHeader && !showEnd) {
      setHeaderDisintegrated(false); // fade out blobs
      setTimeout(() => {
        setShowHeader(true);
        setShowMenu(false);
        setDisplayedBlobs([]);        // <-- clear AFTER fade completes
        setTimeout(() => {
          setHeaderDisintegrated(false);
          setArrowVisible(true);
        }, 350);
      }, FADE_DURATION);
      return;
    }
  };

  // Optional: menu item selection handler (fade out then navigate)
  const handleMenuSelect = (label) => {
    setHeaderDisintegrated(false);
    setTimeout(() => {
      // route or swap views based on 'label'
      console.log("Navigate to:", label);
    }, FADE_DURATION);
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Dither
          waveColor={[0.9, 0.3, 4]}
          disableAnimation={false}
          enableMouseInteraction={false}
          colorNum={10}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.02}
          blobsActive={showMenu && headerDisintegrated} // grows when true, fades when false
          blobs={displayedBlobs}                        // <-- stays populated during fade-out
          growDuration={0.5}
          fadeDuration={FADE_DURATION / 1000}          // 500ms -> 0.5s
        />
      </div>

      {/* Stage */}
      {showHeader ? (
        <Initalheader
          disintegrateRef={disintegrateRef}
          onArrowClick={handleHeaderGone}
        />
      ) : showEnd ? (
        <EndHeader />
      ) : (
        // MainMenu renders whenever we're not on Initial or End
        <MainMenu
          isVisible={headerDisintegrated}       // drives the fade in/out inside MainMenu
          menuBlobs={mainMenuBlobs}
          onTransitionEnd={() => {
            // Hook if you want to do something *after* the fade-out finishes
            // console.log("MainMenu transition complete");
          }}
        // If your MainMenu supports selection callback:
        // onSelect={handleMenuSelect}
        />
      )}

      {/* Up button (top-center) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-700"
        style={{
          top: "2vh",
          opacity: arrowVisible && !showHeader ? 1 : 0,
          pointerEvents: arrowVisible && !showHeader ? "auto" : "none",
          transition: "opacity 0.35s, top 0.7s, transform 0.35s",
          zIndex: 60,
        }}
      >
        {!showHeader && (
          <button
            onClick={handleUpClick}
            aria-label="Go up"
            className="transition-transform focus:outline-none bg-transparent border-none p-0"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.35s",
            }}
          >
            <FuzzyText
              fontSize={40}
              baseIntensity={0.08}
              hoverIntensity={0.4}
              color="#e663e6ff"
              strokeColor="#151515"
              strokeWidth={4}
              enableHover={true}
            >
              ˄
            </FuzzyText>
          </button>
        )}
      </div>

      {/* Down button (bottom-center) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-700"
        style={{
          bottom: "4vh",
          opacity: arrowVisible && !showEnd ? 1 : 0,
          pointerEvents: arrowVisible && !showEnd ? "auto" : "none",
          transition: "opacity 0.35s, bottom 0.7s, transform 0.35s",
          zIndex: 60,
        }}
      >
        {!showEnd && (
          <button
            onClick={handleDownClick}
            aria-label="Go down"
            className="transition-transform focus:outline-none bg-transparent border-none p-0"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.35s",
            }}
          >
            <FuzzyText
              fontSize={54}
              baseIntensity={0.12}
              hoverIntensity={0.5}
              color="#e663e6ff"
              strokeColor="#151515"
              strokeWidth={5}
              enableHover={true}
            >
              ˅
            </FuzzyText>
          </button>
        )}
      </div>
    </main>
  );
}
