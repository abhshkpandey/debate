"use client";

import React, { useState, useActionState } from "react";
import { createChallengeAction, type ChallengeActionState } from "@/app/actions/challenges";
import { CATEGORIES, ChallengeCategory } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Clock, Zap, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";

export function ChallengeCreateWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [state, formAction, isPending] = useActionState<ChallengeActionState, FormData>(
    createChallengeAction,
    {}
  );

  // Form State for client-side step persistence & live validation
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [format, setFormat] = useState<"quick_clash" | "standard">("standard");
  const [positionA, setPositionA] = useState("");
  const [positionB, setPositionB] = useState("");
  const [creatorSide, setCreatorSide] = useState<"a" | "b">("a");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite_only">("public");
  const [deadlineDays, setDeadlineDays] = useState("7");

  // Step 1 validation
  const isStep1Valid = title.trim().length >= 5 && title.length <= 120;
  // Step 2 validation: Only your chosen side is mandatory (at least 3 characters)
  const isStep2Valid =
    creatorSide === "a"
      ? positionA.trim().length >= 3
      : positionB.trim().length >= 3;
  // Step 3 validation
  const isStep3Valid = description.trim().length >= 10 && description.length <= 2000;

  return (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <div className="flex items-center justify-between border-b border-[#E4E0D8] pb-4 text-xs font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step >= 1 ? "bg-[#0B0D10] text-[#C7F36B]" : "bg-[#F1EEE8] text-[#5B6472]"
            }`}
          >
            1
          </div>
          <span className={step >= 1 ? "text-[#0B0D10]" : "text-[#5B6472]"}>
            Topic & Format
          </span>
        </div>

        <div className="h-0.5 w-8 bg-[#E4E0D8] sm:w-16" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step >= 2 ? "bg-[#0B0D10] text-[#C7F36B]" : "bg-[#F1EEE8] text-[#5B6472]"
            }`}
          >
            2
          </div>
          <span className={step >= 2 ? "text-[#0B0D10]" : "text-[#5B6472]"}>
            The Stances
          </span>
        </div>

        <div className="h-0.5 w-8 bg-[#E4E0D8] sm:w-16" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
              step >= 3 ? "bg-[#0B0D10] text-[#C7F36B]" : "bg-[#F1EEE8] text-[#5B6472]"
            }`}
          >
            3
          </div>
          <span className={step >= 3 ? "text-[#0B0D10]" : "text-[#5B6472]"}>
            Context & Rules
          </span>
        </div>
      </div>

      <form action={formAction}>
        {/* Hidden inputs to preserve earlier steps in FormData on submission */}
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="format" value={format} />
        <input type="hidden" name="position_a" value={positionA} />
        <input type="hidden" name="position_b" value={positionB} />
        <input type="hidden" name="creator_side" value={creatorSide} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="visibility" value={visibility} />
        <input type="hidden" name="deadline_days" value={deadlineDays} />

        {state?.error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-[#D93A47]/10 p-4 text-xs font-semibold text-[#D93A47] border border-[#D93A47]/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* STEP 1: Topic & Format */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What are you debating?</CardTitle>
              <CardDescription>
                Frame a clear, compelling claim that has two distinct, defensible perspectives.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="title_input"
                    className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                  >
                    Debate Proposition *
                  </label>
                  <span
                    className={`text-xs ${
                      title.length > 120 ? "text-[#D93A47] font-bold" : "text-[#5B6472]"
                    }`}
                  >
                    {title.length}/120
                  </span>
                </div>
                <input
                  id="title_input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Remote work produces better software than mandatory office presence"
                  maxLength={120}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm font-medium text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                {state?.fieldErrors?.title && (
                  <p className="text-[11px] text-[#D93A47]">{state.fieldErrors.title}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="category_input"
                  className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                >
                  Category *
                </label>
                <select
                  id="category_input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChallengeCategory)}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                  Debate Format *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormat("quick_clash")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      format === "quick_clash"
                        ? "border-[#0B0D10] bg-[#FAF8F4] ring-2 ring-[#0B0D10]"
                        : "border-[#E4E0D8] bg-[#FFFFFF] hover:border-[#5B6472]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#0B0D10]">
                        <Zap className="h-4 w-4 text-[#C7F36B] fill-[#C7F36B]" />
                        <span>Quick Clash</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6472] bg-[#F1EEE8] px-2 py-0.5 rounded">
                        ~2 min
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#5B6472] leading-relaxed">
                      2 rounds. 60s Opening (500 chars) + 60s Closing (500 chars). Fast, intense, high-energy.
                    </p>
                  </div>

                  <div
                    onClick={() => setFormat("standard")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      format === "standard"
                        ? "border-[#0B0D10] bg-[#FAF8F4] ring-2 ring-[#0B0D10]"
                        : "border-[#E4E0D8] bg-[#FFFFFF] hover:border-[#5B6472]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-[#0B0D10]">
                        <Clock className="h-4 w-4 text-[#6B5CE6]" />
                        <span>Standard Debate</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6472] bg-[#F1EEE8] px-2 py-0.5 rounded">
                        ~10 min
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#5B6472] leading-relaxed">
                      3 rounds. Opening (60s/500c), Rebuttal & Cross (60s/500c), Closing (30s/300c).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="gap-2 font-bold"
              >
                Next: Define Stances <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: The Two Stances */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Define the Stances</CardTitle>
              <CardDescription>
                Explicitly state both sides and select which position you will defend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Side A */}
              <div className={`space-y-2 rounded-xl border p-4 transition-all ${
                creatorSide === "a"
                  ? "border-[#0B0D10] bg-[#FFFFFF] ring-1 ring-[#0B0D10]"
                  : "border-[#E4E0D8] bg-[#FAF8F4]"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                    Side A Position {creatorSide === "a" ? "* (Your Stance)" : "(Optional - Opposing Stance)"}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#0B0D10] cursor-pointer">
                    <input
                      type="radio"
                      name="side_selector"
                      checked={creatorSide === "a"}
                      onChange={() => setCreatorSide("a")}
                      className="text-[#0B0D10] focus:ring-[#0B0D10]"
                    />
                    <span>I will argue this side</span>
                  </label>
                </div>
                <textarea
                  value={positionA}
                  onChange={(e) => setPositionA(e.target.value)}
                  placeholder={
                    creatorSide === "a"
                      ? "e.g. Distributed engineering teams have higher autonomy, deeper focus time, and produce higher architectural quality."
                      : "Optional: Suggest the counter-stance, or leave blank for your opponent to define..."
                  }
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                <div className="flex items-center justify-between text-[11px] text-[#5B6472]">
                  <span>{positionA.length}/300 chars</span>
                  {creatorSide !== "a" && !positionA.trim() && (
                    <span className="italic text-[#5B6472]/80">Defaults to open counter-stance if blank</span>
                  )}
                </div>
              </div>

              {/* Side B */}
              <div className={`space-y-2 rounded-xl border p-4 transition-all ${
                creatorSide === "b"
                  ? "border-[#0B0D10] bg-[#FFFFFF] ring-1 ring-[#0B0D10]"
                  : "border-[#E4E0D8] bg-[#FAF8F4]"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                    Side B Position {creatorSide === "b" ? "* (Your Stance)" : "(Optional - Opposing Stance)"}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#0B0D10] cursor-pointer">
                    <input
                      type="radio"
                      name="side_selector"
                      checked={creatorSide === "b"}
                      onChange={() => setCreatorSide("b")}
                      className="text-[#0B0D10] focus:ring-[#0B0D10]"
                    />
                    <span>I will argue this side</span>
                  </label>
                </div>
                <textarea
                  value={positionB}
                  onChange={(e) => setPositionB(e.target.value)}
                  placeholder={
                    creatorSide === "b"
                      ? "e.g. Colocated teams communicate with far lower latency, mentor junior engineers faster, and build higher interpersonal cohesion."
                      : "Optional: Suggest the opposing counter-stance, or leave blank for your opponent to define..."
                  }
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                <div className="flex items-center justify-between text-[11px] text-[#5B6472]">
                  <span>{positionB.length}/300 chars</span>
                  {creatorSide !== "b" && !positionB.trim() && (
                    <span className="italic text-[#5B6472]/80">Defaults to open counter-stance if blank</span>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="gap-2 font-bold"
              >
                Next: Rules & Context <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: Context & Visibility */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Context & Visibility</CardTitle>
              <CardDescription>
                Provide background context and determine how opponents can discover your challenge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="description_input"
                    className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                  >
                    Detailed Context & Argument Scope *
                  </label>
                  <span
                    className={`text-xs ${
                      description.length > 2000 ? "text-[#D93A47] font-bold" : "text-[#5B6472]"
                    }`}
                  >
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  id="description_input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Elaborate on why this question matters, boundary conditions of the debate, and what evidence or premises you intend to bring to bear..."
                  rows={6}
                  maxLength={2000}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                />
                <p className="text-[11px] text-[#5B6472]">
                  Note: All URLs and references are verified for safe protocols (http/https).
                </p>
              </div>

              {/* Visibility Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]">
                  Challenge Visibility *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setVisibility("public")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      visibility === "public"
                        ? "border-[#0B0D10] bg-[#FAF8F4] ring-2 ring-[#0B0D10]"
                        : "border-[#E4E0D8] bg-[#FFFFFF]"
                    }`}
                  >
                    <span className="font-bold text-sm text-[#0B0D10] block">Public Explore Feed</span>
                    <p className="mt-1 text-xs text-[#5B6472]">
                      Listed publicly for anyone on Debate to browse and accept, plus shareable via direct link.
                    </p>
                  </div>

                  <div
                    onClick={() => setVisibility("invite_only")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      visibility === "invite_only"
                        ? "border-[#0B0D10] bg-[#FAF8F4] ring-2 ring-[#0B0D10]"
                        : "border-[#E4E0D8] bg-[#FFFFFF]"
                    }`}
                  >
                    <span className="font-bold text-sm text-[#0B0D10] block">Invite Link Only</span>
                    <p className="mt-1 text-xs text-[#5B6472]">
                      Hidden from the public feed. Only opponents you directly share the secret invite link with can view and accept.
                    </p>
                  </div>
                </div>
              </div>

              {/* Deadline Selection */}
              <div className="space-y-1.5">
                <label
                  htmlFor="deadline_days"
                  className="text-xs font-bold uppercase tracking-wider text-[#0B0D10]"
                >
                  Deadline to Find an Opponent
                </label>
                <select
                  id="deadline_days"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3.5 py-2.5 text-sm text-[#0B0D10] focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0B0D10]"
                >
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days (recommended)</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                </select>
                <p className="text-[11px] text-[#5B6472]">
                  Unclaimed challenges will automatically expire when the deadline passes.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-2"
                disabled={isPending}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!isStep3Valid || isPending}
                className="gap-2 font-bold"
              >
                {isPending ? "Creating Challenge..." : "Publish Challenge & Generate Link"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </form>
    </div>
  );
}
