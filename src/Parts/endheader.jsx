import React from "react";
export default function EndHeader() {
  // Render the resume PDF from the public folder in an iframe that overlays Dither.
  // Using src="/resume.pdf" ensures the file is served from public.
  return (
    <div className="absolute inset-x-0 mx-auto my-25 w-[90%] max-w-5xl h-[80vh]" style={{ zIndex: 50 }}>
      <iframe
        title="End Header - Resume"
        src="/resume.pdf"
        className="w-full h-full border-0 rounded-lg shadow-xl"
        style={{ background: "rgba(255, 255, 255, 0.95)" }}
      />
    </div>
  );
}
