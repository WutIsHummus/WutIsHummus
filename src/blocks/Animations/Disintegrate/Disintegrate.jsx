import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import gsap from "gsap";

// You can still tune these for performance vs. quality
const PARTICLE_COUNT = 75; 
const DENSITY_FACTOR = 3;

const Disintegrate = forwardRef(({ children, onDisintegrated = () => {} }, ref) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRefs = useRef([]);
  const [isHidingChildren, setIsHidingChildren] = useState(false);

  useEffect(() => {
    return () => {
      animationRef.current?.kill();
      canvasRefs.current.forEach(canvas => canvas.remove());
      canvasRefs.current = [];
    };
  }, []);

  useImperativeHandle(ref, () => ({
    disintegrate: async () => {
      const captureEl = containerRef.current;
      if (!captureEl || isHidingChildren) return;

      const canvas = await html2canvas(captureEl, {
        backgroundColor: null,
        scale: 0.7, // Adjust for performance
      });

      const rect = captureEl.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { width, height, data: pixels } = imageData;

      const particleDataList = Array.from({ length: PARTICLE_COUNT }, () => 
        ctx.createImageData(width, height)
      );
      
      const activeParticleIndices = new Set();

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) continue;

        const x = (i / 4) % width;
        const dataIndex = Math.floor(
          (PARTICLE_COUNT * (Math.random() + (2 * x) / width)) / DENSITY_FACTOR
        );
        const clampedIndex = Math.max(0, Math.min(particleDataList.length - 1, dataIndex));
        
        for (let j = 0; j < 4; j++) {
            particleDataList[clampedIndex].data[i + j] = pixels[i + j];
        }
        activeParticleIndices.add(clampedIndex);
      }

      setIsHidingChildren(true);
      captureEl.style.visibility = "hidden";

      const tl = gsap.timeline({
        onComplete: () => {
          onDisintegrated();
          canvasRefs.current.forEach(canvas => canvas.remove());
          canvasRefs.current = [];
          animationRef.current = null;
        }
      });
      
      animationRef.current = tl;
      canvasRefs.current = [];

      particleDataList.forEach((data, i) => {
        if (!activeParticleIndices.has(i)) {
          return;
        }

        const clonedCanvas = canvas.cloneNode();
        clonedCanvas.getContext("2d").putImageData(data, 0, 0);
        
        clonedCanvas.style.position = "absolute";
        clonedCanvas.style.left = `${rect.left + window.scrollX}px`;
        clonedCanvas.style.top = `${rect.top + window.scrollY}px`;
        clonedCanvas.style.width = `${rect.width}px`;
        clonedCanvas.style.height = `${rect.height}px`;
        clonedCanvas.style.pointerEvents = "none";
        clonedCanvas.style.zIndex = 9999;
        
        document.body.appendChild(clonedCanvas);
        canvasRefs.current.push(clonedCanvas);

        const randomAngle = (Math.random() - 0.5) * 2 * Math.PI;
        const randomRotation = 30 * (Math.random() - 0.5);

        // ✅ THE ONLY CHANGE IS HERE
        // All animations are added at the 0-second mark of the timeline.
        tl.to(clonedCanvas, {
          duration: 1.2,
          rotate: randomRotation,
          x: 80 * Math.sin(randomAngle),
          y: 80 * Math.cos(randomAngle),
          opacity: 0,
          ease: "power1.inOut"
        }, 0); // Changed from a staggered time to 0
      });
    }
  }));

  return (
    <div ref={containerRef}>
      {!isHidingChildren && children}
    </div>
  );
});

export default Disintegrate;