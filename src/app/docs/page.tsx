import React from 'react';
import { Metadata } from 'next';
import DocsPageClient from './_components/DocsPageClient';

export const metadata: Metadata = {
  title: 'Dokumentasi & Panduan Penggunaan - EventFlow',
  description: 'Panduan lengkap dan interaktif penggunaan EventFlow untuk Event Organizers (EO) dan kru lapangan.',
};

export default function DocsPage() {
  return <DocsPageClient />;
}
