import { redirect } from "next/navigation";
import Image from "next/image";
import { GitBranch, LockKeyhole } from "lucide-react";
import { auth } from "@/src/auth";
import { signInWithGitHub, signInWithGoogle } from "@/src/app/auth/actions";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (session?.user) redirect("/dashboard");

  const errorMessage = params.error
    ? "Sign-in could not be completed. Please try again or choose another provider."
    : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center bg-[#121211] px-5 py-14 sm:px-8 lg:px-12">
      <section className="w-full max-w-md rounded-lg border border-[#2B2A24] bg-[#1B1B18] p-8">
        <div className="mx-auto flex size-14 items-center justify-center rounded-md border border-[#383730] bg-[#121211] text-[#F59E0B]">
          <LockKeyhole aria-hidden="true" size={28} />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[#EDEDE8]">Sign in to</h1>
          <Image
            src="/Healix_Text_Logo.png"
            alt="Healix"
            width={65}
            height={40}
            priority
            unoptimized
            className="h-13 w-auto object-contain"
          />
        </div>
        <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-6 text-[#A1A19A]">
          Sign in to connect your services and bring calm to your incident response.
        </p>

        {errorMessage && (
          <p role="alert" className="mt-6 rounded-md border border-rose-800/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
            {errorMessage}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <form action={signInWithGitHub}>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#383730] bg-[#242420] px-5 text-sm font-medium text-[#EDEDE8] transition-colors hover:bg-[#2F2E29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
            >
              <GitBranch aria-hidden="true" size={18} />
              Continue with GitHub
            </button>
          </form>
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#383730] bg-[#242420] px-5 text-sm font-medium text-[#EDEDE8] transition-colors hover:bg-[#2F2E29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
            >
              <span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-[#EDEDE8] text-xs font-bold text-[#242420]">G</span>
              Continue with Google
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
