import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"
import { SpriteAnimation } from "@/components/sprite-animation"
import { numberedFrames } from "@/lib/sprites"

export default function Home() {
  return (
    <AuthShell
      left={
        <SpriteAnimation
          frames={numberedFrames("/sprites/pokemon-overworld/ho-oh", 7)}
          width={63}
          height={62}
          scale={4}
          alt="Ho-Oh en vol"
        />
      }
      right={
        <SpriteAnimation
          frames={numberedFrames("/sprites/pokemon-overworld/lugia", 7)}
          width={63}
          height={61}
          scale={4}
          alt="Lugia en vol"
        />
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
