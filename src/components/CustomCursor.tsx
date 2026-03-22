"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function CustomCursor() {
  const pathname = usePathname();

  useEffect(() => {
    const cur = document.getElementById("cur");
    const curR = document.getElementById("curR");
    if (!cur || !curR) return;

    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx + "px";
      cur.style.top = my + "px";
    };
    document.addEventListener("mousemove", onMove);

    let raf = 0;
    let running = true;
    const ringFollow = () => {
      if (!running) return;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      curR.style.left = rx + "px";
      curR.style.top = ry + "px";
      raf = requestAnimationFrame(ringFollow);
    };
    ringFollow();

    const hoverTargets = document.querySelectorAll(
      "a,button,.feat-card,.domain-card,.bridge-card,.ex-chip,.gal-card"
    );
    const enterHandler = () => {
      cur.style.width = "18px";
      cur.style.height = "18px";
      curR.style.width = "52px";
      curR.style.height = "52px";
    };
    const leaveHandler = () => {
      cur.style.width = "10px";
      cur.style.height = "10px";
      curR.style.width = "34px";
      curR.style.height = "34px";
    };
    hoverTargets.forEach((el) => {
      el.addEventListener("mouseenter", enterHandler);
      el.addEventListener("mouseleave", leaveHandler);
    });

    return () => {
      running = false;
      document.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      hoverTargets.forEach((el) => {
        el.removeEventListener("mouseenter", enterHandler);
        el.removeEventListener("mouseleave", leaveHandler);
      });
    };
  }, [pathname]);

  return (
    <>
      <div className="cursor" id="cur" />
      <div className="cursor-ring" id="curR" />
    </>
  );
}
