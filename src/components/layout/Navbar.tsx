import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2B2A24] bg-[#121211]">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8 lg:px-12"
      >
        <Link href="/" className="inline-flex items-center gap-2" aria-label="Healix home">
          <Image
            src="/Healix_Logo-clean.png"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7 object-contain"
          />
          <Image
            src="/Healix_Text_Logo.png"
            alt="Healix"
            width={64}
            height={33}
            priority
            className="h-7 w-auto object-contain"
          />
        </Link>

        <div className="ml-auto flex items-center gap-5 sm:gap-8">
          <Link href="/#architecture" className="text-sm text-[#A1A19A] transition-colors hover:text-[#E2E2DC]">
            Docs
          </Link>
          <Link href="/#contact" className="text-sm text-[#A1A19A] transition-colors hover:text-[#E2E2DC]">
            Contact Us
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-[#F59E0B] px-5 py-2 font-medium text-black transition-colors hover:bg-[#D97706] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
          >
            Get Started <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
