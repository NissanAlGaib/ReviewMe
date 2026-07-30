"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { flattenError } from "zod";

import { auth } from "@/lib/auth";
import { LoginSchema, SignupSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function signup(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: flattenError(validatedFields.error).fieldErrors };
  }

  const { name, email, password } = validatedFields.data;

  try {
    await auth.api.signUpEmail({ body: { name, email, password } });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: error.message };
    }
    return { message: "Something went wrong creating your account." };
  }

  redirect("/dashboard");
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: flattenError(validatedFields.error).fieldErrors };
  }

  const { email, password } = validatedFields.data;

  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (error) {
    if (error instanceof APIError) {
      return { message: "Invalid email or password." };
    }
    return { message: "Something went wrong signing you in." };
  }

  redirect("/dashboard");
}

export async function logout() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
