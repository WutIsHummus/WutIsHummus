import React, { useRef, useEffect, useState, memo } from "react";
import ASCIIText from "../blocks/TextAnimations/ASCIIText/ASCIIText";
import RiftBlock from "../blocks/TextAnimations/RiftBlock/RiftBlock";

interface Blob { cx: number; cy: number; rx: number; ry: number; label: string; }
interface PositionedBlob { x: number; y: number; width: number; height: number; label: string; }

interface MainMenuProps {
  isVisible: boolean;             // drives fade in/out
  onTransitionEnd?: () => void;   // called after fade-out completes
  menuBlobs: Blob[];
}

const previewContent: Record<string, { title: string; items: string[]; links?: { text: string; url: string }[] }> = {
  ABOUT: {
    title: "         Alperen Aydin         ",
    items: ["B.S. Computer Science | UT Austin — May 2028", "Austin, TX", "alperenaydin1@gmail.com"],
    links: [
      { text: "GitHub", url: "https://github.com/WutIsHummus" },
      { text: "LinkedIn", url: "https://linkedin.com/in/alperenaydin1" },
    ],
  },
  EXPERIENCE: {
    title: "        Experience        ",
    items: [
      "**Lockheed Martin**", "Fullstack Enterprise Ops Intern", "May 2023 - May 2024", "",
      "**Longhorn Racing Solar**", "Vehicle Controls & Telemetry Developer", "Sep 2025 - Present", "",
      "**Stealth Coach**", "Owner / Lead Developer", "Feb 2025 - Present", "",
      "**Roblox SPTS Studio**", "Lead Programming Dev / Co-Owner", "Sep 2021 - Present", "",
      "**FTC Robotics**", "Captain - Lead Programmer/Designer", "Aug 2021 - Aug 2025", "",
    ],
  },
  PROJECTS: {
    title: "         Projects         ",
    items: [
      "**LHR Photon Vulkan Renderer**", "C++ GPU-accelerated 3D telemetry visualization engine", "Custom rendering pipeline, PBR materials, Vulkan API", "",
      "**Stealth Coach**", "AI-powered productivity tool (.NET + Next.js)", "Machine learning integration, user analytics", "",
      "**Super Power Training Simulator**", "1M+ visits, 10K+ active community", "LUA Programming, game mechanics & framework", "Client & server optimization", "",
      "**Lockheed Martin Code/CyberQuest**", "React TS Registration Pages, FusionAuth SAML SSO", "S3 + Hasura DB sync", "",
      "**7tv2Discord**", "Emote browser with real-time updates", "React, Node.js, WebSocket", "",
      "**The Cosmobots Robotics**", "Ranked 26/8,000 (Top 0.3%)", "Motion profiling + Kalman filter (Java)", "Custom command framework", "",
    ],
  },
  "TECH STACK": {
    title: "          Skills          ",
    items: [
      "**Programming Languages:**", "Java, C++, Python, JS/TS, C#, Lua, SQL", "",
      "**Frontend:**", "React, Next.js, Vue, Tailwind, WebGL/Three.js, Canvas API", "",
      "**Backend/APIs:**", "Node, Express, .NET Core, REST/GraphQL/WebSocket", "",
      "**Databases/Storage:**", "PostgreSQL, MySQL, MongoDB, Redis, AWS S3", "",
      "**Cloud/DevOps:**", "AWS, Docker, Cloudflare, Vercel", "",
      "**Graphics/Game Dev:**", "Vulkan, OpenGL, GLTF, Roblox, Unreal, Shaders, Ray Tracing", "",
      "**Tools:**", "Git, CMake, Confluence, VS Code, Stripe, Firebase, Hasura, Vite, Android Studio",
    ],
  },
};

const DURATION = 700; // ms

const MainMenu: React.FC<MainMenuProps> = memo(({ isVisible, onTransitionEnd, menuBlobs }) => {
  // Mount control: always start unmounted; mount when we first need to show
  const [mounted, setMounted] = useState<boolean>(false);

  // Layout
  const [blobs, setBlobs] = useState<PositionedBlob[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>("ABOUT");
  const [showPDF, setShowPDF] = useState(false);

  // Refs
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuBlobsRef = useRef(menuBlobs);

  useEffect(() => { menuBlobsRef.current = menuBlobs; }, [menuBlobs]);

  // --- Effect 1: ensure we mount when becoming visible ---
  useEffect(() => {
    if (isVisible && !mounted) {
      setMounted(true); // triggers a render where wrapRef will exist
    }
  }, [isVisible, mounted]);

  // --- Effect 2: run transitions once mounted and the node exists ---
  useEffect(() => {
    if (!mounted) return; // no node yet
    const node = wrapRef.current;
    if (!node) return;

    // make sure transition is set (do it once or every time, it's fine)
    node.style.transition = `opacity ${DURATION}ms ease-in-out`;

    // handler for fade-out completion
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "opacity") return;
      if (!isVisible) {
        setMounted(false);       // actually unmount after fade-out
        onTransitionEnd?.();     // notify parent
      }
    };
    node.addEventListener("transitionend", onEnd);

    // kick the animation on the next frame so the browser sees the change
    if (isVisible) {
      // fade in: start from 0 → 1
      node.style.opacity = "0";
      requestAnimationFrame(() => {
        node.style.opacity = "1";
      });
    } else {
      // fade out: 1 → 0
      node.style.opacity = getComputedStyle(node).opacity || "1";
      requestAnimationFrame(() => {
        node.style.opacity = "0";
      });
    }

    return () => node.removeEventListener("transitionend", onEnd);
  }, [isVisible, mounted, onTransitionEnd]);

  // --- Layout calc for blobs ---
  useEffect(() => {
    if (!mounted) return;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const calc = () => {
      if (!containerRef.current) return;
      const { width: w, height: h } = containerRef.current.getBoundingClientRect();
      const next = menuBlobsRef.current.map(b => ({
        x: (b.cx + 0.5) * w,
        y: h / 2 + b.cy * w,
        width: b.rx * 2 * w,
        height: b.ry * 2 * w,
        label: b.label,
      }));
      setBlobs(next);
    };
    const onResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(calc, 100);
    };
    calc();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); if (resizeTimeout) clearTimeout(resizeTimeout); };
  }, [mounted]);

  // If not mounted (either initial or after fade-out), render nothing
  if (!mounted) return null;

  return (
    <div
      ref={wrapRef}
      style={{
        opacity: 0, // initial paint hidden; effect will flip to 1 on show
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      <div ref={containerRef} className="w-full h-screen relative overflow-hidden">
        {blobs.map((b, i) => (
          <div
            key={`blob-${b.label}-${i}`}
            style={{
              position: "absolute",
              left: b.x, top: b.y,
              width: b.width, height: b.height,
              transform: "translate(-50%, -50%)",
              clipPath: "ellipse(50% 50% at 50% 50%)",
              WebkitClipPath: "ellipse(50% 50% at 50% 50%)",
              overflow: "visible",
            }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center hover:cursor-cell"
              onMouseEnter={() => b.label && setSelectedSection(b.label)}
            >
              {b.label ? (
                <RiftBlock
                  key={`riftblock-${b.label}`}
                  text={b.label}
                  fontSize={Math.min(50, b.width / 9)}
                  color="#833b7fff"
                  strokeColor="#f093f0ff"
                  strokeWidth={1}
                  className="rift-block-menu"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center w-full h-full">
                  {selectedSection && previewContent[selectedSection] && (
                    <div
                      key={selectedSection}
                      className="space-y-4"
                      style={{
                        animation: "fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1) forwards",
                        maxWidth: "min(90%, 800px)",
                        width: "100%"
                      }}
                    >
                      <div className="w-full" style={{ height: "100px", overflow: "hidden" }}>
                        {/* @ts-ignore */}
                        <ASCIIText
                          text={previewContent[selectedSection].title}
                          enableWaves={true}
                          asciiFontSize={3}
                          planeBaseHeight={10}
                          fitPadding={0.95}
                          fitMode="contain"
                          squishLimit={0.9}
                          styleMode="creative"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        {previewContent[selectedSection].items.map((item, idx) =>
                          item === "" ? (
                            <div key={idx} style={{ height: 8 }} />
                          ) : (
                            <p
                              key={idx}
                              style={{
                                color:
                                  item.endsWith(":") || item.includes("@") || item.includes("—") || item.startsWith("**")
                                    ? "#f0f0f0" : "#d0d0d0",
                                textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
                                fontWeight: item.endsWith(":") || item.startsWith("**") ? 700 : 500,
                                animation: `fadeInUp 0.5s ease-out ${idx * 0.05}s both`,
                                lineHeight: "1.5",
                                fontSize: `clamp(0.5rem, ${b.width / 60}px, 1.2rem)`,
                              }}
                              dangerouslySetInnerHTML={{
                                __html: item.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                              }}
                            />
                          )
                        )}

                        {previewContent[selectedSection].links && (
                          <div
                            className="flex gap-4 justify-center mt-4"
                            style={{ animation: `fadeInUp 0.5s ease-out ${previewContent[selectedSection].items.length * 0.05}s both` }}
                          >
                            {previewContent[selectedSection].links!.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold"
                                style={{
                                  color: "#e663e6ff",
                                  textShadow: "1px 1px 3px rgba(193, 56, 235, 0.9)",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                  transition: "color 0.2s ease",
                                  fontSize: `clamp(0.55rem, ${b.width / 65}px, 1.15rem)`,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "#ce42ceff")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "#e663e6ff")}
                              >
                                {link.text}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default MainMenu;
