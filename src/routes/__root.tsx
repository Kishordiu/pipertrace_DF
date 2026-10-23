import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { ThreeLogoLoader } from "@/components/ThreeLogoLoader";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Try again</button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PiperTrace — Evidence, not just a verdict" },
      { name: "description", content: "Local-first multimodal media forensics with account-protected evidence cases." },
      { name: "theme-color", content: "#2d4248" },
      { name: "application-name", content: "PiperTrace" },
      { property: "og:site_name", content: "PiperTrace" },
      { property: "og:title", content: "PiperTrace — Evidence, not just a verdict" },
      { property: "og:description", content: "Local-first digital evidence review for images, documents, video and audio, with visible methods and honest limitations." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://pipertrace.vercel.app/" },
      { property: "og:image", content: "https://pipertrace.vercel.app/pipertrace-share-card.svg?v=2" },
      { property: "og:image:secure_url", content: "https://pipertrace.vercel.app/pipertrace-share-card.svg?v=2" },
      { property: "og:image:type", content: "image/svg+xml" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "PiperTrace — Evidence, not just a verdict." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PiperTrace — Evidence, not just a verdict" },
      { name: "twitter:description", content: "Local-first digital evidence review for images, documents, video and audio." },
      { name: "twitter:image", content: "https://pipertrace.vercel.app/pipertrace-share-card.svg?v=2" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@300..600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" },
      { rel: "icon", href: "/pipertrace-favicon.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { rel: "shortcut icon", href: "/pipertrace-favicon.svg?v=2", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><Outlet /><Toaster /><ThreeLogoLoader /></QueryClientProvider>;
}
