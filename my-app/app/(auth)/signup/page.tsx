"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signup } from "@/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-[52px] w-full items-center justify-center rounded-xl bg-ink font-sans text-[15px] font-bold text-cream transition-opacity disabled:opacity-50"
    >
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, undefined);

  return (
    <div className="ticket flex flex-col">
      <div className="rounded-t-[18px] bg-ink px-6 pt-6 pb-[18px] text-center text-cream">
        <div className="font-mono text-[11px] font-bold tracking-[.16em]">★ NEW MEMBER ★</div>
        <div className="mt-2 font-sans text-xl font-extrabold tracking-tight">ReviewMe</div>
      </div>
      <div className="perf" />
      <div className="flex flex-col gap-[22px] px-[26px] py-8">
        <div>
          <div className="font-sans text-[19px] font-bold text-ink">Create your account</div>
          <div className="mt-[5px] font-sans text-[13px] font-medium text-muted">
            Turn your exam materials into reviewable quizzes.
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-[18px]">
            <div>
              <div className="field-label">Name</div>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Maria Santos"
                className="field-input"
              />
              {state?.errors?.name && (
                <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
              )}
            </div>
            <div>
              <div className="field-label">Email</div>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="maria@example.com"
                className="field-input"
              />
              {state?.errors?.email && (
                <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
              )}
            </div>
            <div>
              <div className="field-label">Password</div>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="field-input"
              />
              {state?.errors?.password && (
                <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
              )}
            </div>
          </div>

          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

          <SubmitButton />
        </form>

        <div className="text-center font-sans text-[13px] font-medium text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-amber underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
