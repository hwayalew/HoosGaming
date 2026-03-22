"use client";

import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        onError: () => {},
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}
