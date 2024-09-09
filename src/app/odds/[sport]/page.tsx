import { OddsDataTable } from "@/components/OddsDataTable";
import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { notFound, redirect } from "next/navigation";
import { dataTableMode, getOdds } from "../../../../lib/api";

const Page = async ({ params }: { params: Params }) => {
  const { sport } = params;

  if (dataTableMode) {
    const odds = await getOdds(sport);
    if (!odds) {
      notFound();
    }
    return <OddsDataTable odds={odds} />;
  }

  return redirect(`/odds/${sport}/moneyline`);
};

export default Page;
