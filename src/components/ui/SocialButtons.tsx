import { SiFacebook, SiGoogle, SiX, SiGithub } from "react-icons/si";
import { FaApple } from "react-icons/fa";

/**
 * Props are intentionally simple; wire them to NextAuth/Supabase/etc.  "apple" |
 */
type Provider = "google" | "facebook" | "github" | "x";

type SocialButtonsProps = {
  disabled?: boolean;
  onSignIn: (provider: Provider) => void;
};

const base =
  "w-80 h-12 rounded-xl px-4 inline-flex items-center justify-center gap-3 text-[15px] font-medium " +
  "transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const iconCls = "h-5 w-5";

export function SocialButtons({ disabled, onSignIn }: SocialButtonsProps) {
  return (
    <div className="space-y-3 flex flex-col items-center">
      {/* Google: white background, subtle border */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSignIn("google")}
        className={[
          base,
          "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
          "focus-visible:ring-zinc-300",
        ].join(" ")}
        aria-label="Continue with Google"
      >
        <SiGoogle className={iconCls} aria-hidden="true" />
        <span>Continue with Google</span>
      </button>

      {/* Apple: black background */}
      {/* <button
        type="button"
        disabled={disabled}
        onClick={() => onSignIn("apple")}
        className={[
          base,
          "bg-black text-white hover:bg-black/90",
          "focus-visible:ring-zinc-500",
        ].join(" ")}
        aria-label="Continue with Apple"
      >
        <FaApple className={iconCls} aria-hidden="true" />
        <span>Continue with Apple</span>
      </button> */}

      {/* GitHub: near-black / slate */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSignIn("github")}
        className={[
          base,
          "bg-zinc-900 text-white hover:bg-zinc-800",
          "focus-visible:ring-zinc-500",
        ].join(" ")}
        aria-label="Continue with GitHub"
      >
        <SiGithub className={iconCls} aria-hidden="true" />
        <span>Continue with GitHub</span>
      </button>

      {/* X: black background (brand commonly uses black/white) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSignIn("x")}
        className={[
          base,
          "bg-black text-white hover:bg-black/90",
          "focus-visible:ring-zinc-500",
        ].join(" ")}
        aria-label="Continue with X"
      >
        <SiX className={iconCls} aria-hidden="true" />
        <span>Continue with X</span>
      </button>

      {/* Facebook: blue background */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSignIn("facebook")}
        className={[
          base,
          "bg-[#1877F2] text-white hover:bg-[#166FE5]",
          "focus-visible:ring-blue-300",
        ].join(" ")}
        aria-label="Continue with Facebook"
      >
        <SiFacebook className={iconCls} aria-hidden="true" />
        <span className="text-white">Continue with Facebook</span>
      </button>
    </div>
  );
}