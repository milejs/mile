"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { CheckIcon, Loader2, X } from "lucide-react";
import { authClient } from "./auth-client";
import { toast } from "sonner";
import { Checkbox } from "@base-ui-components/react/checkbox";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <div className="bg-white max-w-md mx-auto text-zinc-800 flex flex-col gap-6 border py-6 shadow-sm rounded-md">
      <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 [.border-b]:pb-6">
        <div className="leading-none font-semibold text-lg md:text-xl">
          Sign In
        </div>
        <div className="text-zinc-500 text-xs md:text-sm">
          Enter your email below to login to your account
        </div>
      </div>
      <div className="px-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center">
              <label htmlFor="password">Password</label>
              {/*<a href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </a>*/}
            </div>

            <Input
              id="password"
              type="password"
              placeholder="password"
              autoComplete="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-base text-gray-900">
              <Checkbox.Root
                className="flex size-5 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 data-[checked]:bg-gray-900 data-[unchecked]:border data-[unchecked]:border-gray-300"
                checked={rememberMe}
                onCheckedChange={(v: boolean) => {
                  setRememberMe(v);
                }}
              >
                <Checkbox.Indicator className="flex text-gray-50 data-[unchecked]:hidden">
                  <CheckIcon className="size-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              Remember me
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              await authClient.signIn.email(
                {
                  email,
                  password,
                },
                {
                  onRequest: (ctx: any) => {
                    setLoading(true);
                  },
                  onResponse: (ctx: any) => {
                    setLoading(false);
                  },
                },
              );
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <p> Login </p>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="bg-white max-w-md mx-auto text-zinc-800 flex flex-col gap-6 border py-6 shadow-sm rounded-md">
      <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 [.border-b]:pb-6">
        <div className="leading-none font-semibold text-lg md:text-xl">
          Sign Up
        </div>
        <div className="text-zinc-500 text-xs md:text-sm">
          Enter your information to create an account
        </div>
      </div>
      <div className="px-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="full-name">Full name</label>
            <Input
              id="full-name"
              placeholder="John Smith"
              required
              onChange={(e) => {
                setName(e.target.value);
              }}
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              required
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">Password</label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Password"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password">Confirm Password</label>
            <Input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
              placeholder="Confirm Password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              await authClient.signUp.email({
                email,
                password,
                name,
                callbackURL: "/mile",
                fetchOptions: {
                  onResponse: () => {
                    setLoading(false);
                  },
                  onRequest: () => {
                    setLoading(true);
                  },
                  onError: (ctx: any) => {
                    console.log("ctx", ctx);

                    toast.error(ctx.error.message);
                  },
                  onSuccess: async () => {
                    window.location.assign("/mile");
                  },
                },
              });
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Create an account"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
