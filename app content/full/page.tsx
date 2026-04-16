"use client";
import { Suspense } from "react";
import FullAssessment from "@/components/assessment/FullAssessment";

function FullPageContent(){
  return (
    <main>
      <FullAssessment />
    </main>
  );
}

export default function FullPage(){
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <FullPageContent />
    </Suspense>
  );
}


