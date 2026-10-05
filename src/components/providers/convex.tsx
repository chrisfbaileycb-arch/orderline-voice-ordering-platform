import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from "convex/react";
import { firebaseDataClient } from "@/lib/firebase-data-client.ts";

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseConvexProvider client={firebaseDataClient as unknown as ConvexReactClient}>
      {children}
    </BaseConvexProvider>
  );
}
