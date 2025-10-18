// Validate Clerk JWT issuer domain at startup
const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!clerkJwtIssuerDomain) {
  throw new Error(
    "CLERK_JWT_ISSUER_DOMAIN is not configured. " +
    "This must be set in both:\n" +
    "1. Your .env.local file (e.g., https://your-instance.clerk.accounts.dev)\n" +
    "2. Convex deployment environment variables via: npx convex env set CLERK_JWT_ISSUER_DOMAIN \"your_domain\"\n" +
    "See: https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances"
  );
}

const authConfig = {
  providers: [
    {
      // Clerk JWT template configuration
      // The domain must match your Clerk JWT template issuer
      domain: clerkJwtIssuerDomain,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
