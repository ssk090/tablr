"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const NewDinnerContent = dynamic(
  () => import("./new-dinner-content"),
  { ssr: false },
);

export default function NewDinnerPage() {
  return (
    <Suspense>
      <NewDinnerContent />
    </Suspense>
  );
}
