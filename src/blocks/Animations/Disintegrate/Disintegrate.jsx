import { useRef, useImperativeHandle, forwardRef, useState } from "react";
import html2canvas from "html2canvas";
import gsap from "gsap";

const COUNT = 75;
const REPEAT_COUNT = 3;

const Disintegrate = forwardRef(({ children, onDisintegrated }, ref) => {
    const containerRef = useRef();
    const [hideChildren, setHideChildren] = useState(false);

    useImperativeHandle(ref, () => ({
        disintegrate: () => {
            const captureEl = containerRef.current;
            if (!captureEl) return;

            html2canvas(captureEl, { backgroundColor: null }).then((canvas) => {
                const rect = captureEl.getBoundingClientRect();
                const width = canvas.width;
                setHideChildren(true);
                const height = canvas.height;
                const ctx = canvas.getContext("2d");
                const imageData = ctx.getImageData(0, 0, width, height);

                let dataList = [];
                for (let i = 0; i < COUNT; i++) {
                    dataList.push(ctx.createImageData(width, height));
                }

                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        for (let l = 0; l < REPEAT_COUNT; l++) {
                            const index = (x + y * width) * 4;
                            const dataIndex = Math.floor(
                                (COUNT * (Math.random() + (2 * x) / width)) / 3
                            );
                            for (let p = 0; p < 4; p++) {
                                dataList[dataIndex].data[index + p] = imageData.data[index + p];
                            }
                        }
                    }
                }

                // Hide original
                captureEl.style.visibility = "hidden";

                dataList.forEach((data, i) => {
                    let clonedCanvas = canvas.cloneNode();
                    clonedCanvas.getContext("2d").putImageData(data, 0, 0);
                    clonedCanvas.className = "capture-canvas";
                    clonedCanvas.style.position = "absolute";
                    clonedCanvas.style.left = `${rect.left + window.scrollX}px`;
                    clonedCanvas.style.top = `${rect.top + window.scrollY}px`;
                    clonedCanvas.style.pointerEvents = "none";
                    clonedCanvas.style.zIndex = 9999;
                    document.body.appendChild(clonedCanvas);

                    const randomAngle = (Math.random() - 0.5) * 2 * Math.PI;
                    const randomRotationAngle = 30 * (Math.random() - 0.5);

                    gsap.to(clonedCanvas, {
                        duration: 1.2,
                        rotate: randomRotationAngle,
                        x: 80 * Math.sin(randomAngle),
                        y: 80 * Math.cos(randomAngle),
                        opacity: 0,
                        delay: (i / dataList.length) * 0.3,
                        onComplete: () => {
                            clonedCanvas.remove();
                        }
                    });
                });

                onDisintegrated()
            });
        }
    }));

    return (
        <div ref={containerRef} style={{ position: "relative" }}>
            {!hideChildren && children}
        </div>
    );
});

export default Disintegrate;
