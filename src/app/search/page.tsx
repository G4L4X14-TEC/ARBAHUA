
import SearchPageClient from "@/components/search/SearchPageClient";

export const dynamic = 'force-dynamic'; // Ensures searchParams are fresh

export default function SearchPage({ 
  searchParams 
}: { 
  searchParams?: { [key: string]: string | string[] | undefined } 
}) {
  const initialSearchTerm = typeof searchParams?.q === 'string' ? searchParams.q : null;
  const initialCategoryId = typeof searchParams?.category === 'string' ? searchParams.category : null;

  return (
    <SearchPageClient 
      initialSearchTerm={initialSearchTerm}
      initialCategoryId={initialCategoryId}
    />
  );
}
