"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function EditorRedirect() {
  const { id } = useParams<{ id: string }>();
  const sheet = useSearchParams().get("sheet");
  const router = useRouter();
  useEffect(() => {
    router.replace(`/projects/${id}${sheet ? `?sheet=${sheet}` : ""}`);
  }, [id, sheet, router]);
  return null;
}
