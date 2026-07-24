"use client";

import AdminGuard from "../_components/AdminGuard";
import IdentidadeVisual from "../IdentidadeVisual";

export default function IdentidadePage() {
  return (
    <AdminGuard active="identidade" title="Identidade Visual">
      <IdentidadeVisual />
    </AdminGuard>
  );
}
