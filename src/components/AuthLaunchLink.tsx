"use client";

import type { CSSProperties } from "react";
import Link from "next/link";

type Props = {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
};

export function AuthLaunchLink({ href, className, style, children }: Props) {
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
