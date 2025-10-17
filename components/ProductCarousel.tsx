"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search } from "lucide-react";

interface ProductCarouselProps {
  queryId: Id<"queries">;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  source?: string;
  limit?: number;
  onSaveProduct?: (productId: string) => void;
}

export function ProductCarousel({
  queryId,
  minPrice,
  maxPrice,
  minRating,
  source,
  limit,
  onSaveProduct,
}: ProductCarouselProps) {
  // Fetch products with optional filters
  const products = useQuery(
    api.products.getFilteredProducts,
    minPrice !== undefined || maxPrice !== undefined || minRating !== undefined || source
      ? {
          queryId,
          minPrice,
          maxPrice,
          minRating,
          source,
          limit,
        }
      : { queryId, limit }
  );

  // Fetch query status
  const query = useQuery(api.queries.getQueryStatus, { queryId });

  if (products === undefined || query === undefined) {
    return <ProductCarouselSkeleton />;
  }

  if (query.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Search Failed</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>We couldn&apos;t complete your search. This might be due to:</p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
            <li>Network connectivity issues</li>
            <li>API service temporarily unavailable</li>
            <li>Invalid search parameters</li>
          </ul>
          <p className="mt-3 text-sm font-medium">
            💡 Try: Create a new search with simpler terms, or check your internet connection.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (query.status === "searching" || query.status === "pending") {
    return (
      <div className="space-y-4">
        <Alert>
          <Search className="h-4 w-4 animate-spin" />
          <AlertTitle>Searching...</AlertTitle>
          <AlertDescription>
            We are searching for the best products for: <strong>{query.searchText}</strong>
          </AlertDescription>
        </Alert>
        <ProductCarouselSkeleton />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Alert>
        <Search className="h-4 w-4" />
        <AlertTitle>No Products Found</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>We couldn&apos;t find any products matching your search.</p>
          <p className="text-sm font-medium mt-3">
            💡 Try these tips:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-2">
            <li>Use more general search terms (e.g., &quot;laptop&quot; instead of &quot;Dell XPS 15 2024 model&quot;)</li>
            <li>Remove or adjust price filters if you set any</li>
            <li>Check for spelling errors</li>
            <li>Try searching for a similar product category</li>
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  // Determine if we're using mock data or real API
  const isMockData = products.length > 0 && products.every((p) => p.source === "mock");
  const dataSource = isMockData ? "mock" : products.length > 0 && products.some((p) => p.source === "serpapi") ? "serpapi" : "unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {products.length} Product{products.length !== 1 ? "s" : ""} Found
          </h2>
          {dataSource === "mock" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
              ⚠️ Demo Data
            </span>
          )}
          {dataSource === "serpapi" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              ✓ Real Data
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          For: <strong>{query.searchText}</strong>
        </p>
      </div>

      {dataSource === "mock" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription>
            You&apos;re seeing sample products. Add your <strong>SERPAPI_KEY</strong> to environment variables to search real products from Google Shopping.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} onSave={onSaveProduct} />
        ))}
      </div>
    </div>
  );
}

function ProductCarouselSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
