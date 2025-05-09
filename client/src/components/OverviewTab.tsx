// client/src/components/OverviewTab.tsx
import { useMemo } from 'react';
import { PropertyType } from '@/types/PropertyTypes';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils';
import { Cell, Pie } from 'recharts';
import { Legend, PieChart } from 'recharts';
import { Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ResponsiveContainer } from 'recharts';
import {
  portfolioData,
  getInvestmentTotal,
  getTotalInvestmentIncome,
  upcomingTasks,
} from '@/lib/mockData';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

interface OverviewTabProps {
  properties: PropertyType[];
}

export default function OverviewTab({ properties = [] }: OverviewTabProps) {
  // Calculate totals using useMemo for performance
  const totals = useMemo(() => {
    let realEstateAssets = 0;
    let liabilities = 0;
    let mortgageExpenses = 0;
    let hoaExpenses = 0;
    let monthlyRent = 0;
    let cashflow = 0;

    for (const prop of properties) {
      realEstateAssets += prop.price || 0;
      liabilities += prop.mortgageBalance || 0;
      mortgageExpenses += prop.mortgagePayment || 0;
      hoaExpenses += prop.hoaPayment || 0;
      monthlyRent += prop.monthlyRent || 0;
      const propertyCashFlow =
        (prop.monthlyRent || 0) -
          (prop.mortgagePayment || 0) -
          (prop.hoaPayment || 0) || 0;
      cashflow += propertyCashFlow;
    }

    const investmentsTotal = getInvestmentTotal();
    const assets = realEstateAssets + investmentsTotal;
    const networth = assets - liabilities;

    const investmentIncome = getTotalInvestmentIncome();
    const totalIncome = monthlyRent + investmentIncome;
    const totalExpenses = mortgageExpenses + hoaExpenses;
    const totalCashflow = totalIncome - totalExpenses;

    // Calculate top performing property
    let topPerformer = null;
    let highestAppreciationPercent = 0;

    for (const prop of properties) {
      if (prop.lastSale && prop.price) {
        const appreciationAmount = prop.price - prop.lastSalePrice;
        const appreciationPercent =
          (appreciationAmount / prop.lastSalePrice) * 100;

        if (appreciationPercent > highestAppreciationPercent) {
          highestAppreciationPercent = appreciationPercent;
          topPerformer = prop;
        }
      }
    }

    return {
      realEstateAssets,
      liabilities,
      mortgageExpenses,
      hoaExpenses,
      monthlyRent,
      networth,
      cashflow,
      topPerformer,
      highestAppreciationPercent,
      assets,
      totalIncome,
      totalExpenses,
      totalCashflow,
      investmentIncome,
    };
  }, [properties]);

  // Sample data for the asset allocation chart
  const assetAllocationData = [
    { name: 'Real Estate', value: totals.realEstateAssets, color: '#F26C6C' },
    { name: 'Stocks', value: portfolioData.stocks, color: '#1E88E5' },
    { name: 'Bonds', value: portfolioData.bonds, color: '#FDD835' },
    { name: 'Cash', value: portfolioData.cash, color: '#43A047' },
  ];

  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-bold">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 w-full">
          <div className="grid grid-cols-2 gap-4 p-4">
            <div className="text-sm text-muted-foreground">Total Assets</div>
            <div className="text-xl font-bold">
              {formatCurrency(totals.assets)}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Liabilities
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(totals.liabilities)}
            </div>
            <div className="text-sm text-muted-foreground">Net Worth</div>
            <div
              className={`text-xl font-bold ${
                totals.networth >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
              {formatCurrency(totals.networth)}
            </div>
          </div>
        </Card>

        <Card className="p-4 w-full">
          <div className="grid grid-cols-4 gap-4 p-1 items-center">
            <div className="text-sm text-muted-foreground">
              Monthly Mortgage Payments
            </div>
            <div className="text-xl font-bold">
              {formatCurrencyShort(totals.mortgageExpenses)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Rent</div>
            <div className="text-xl font-bold">
              {formatCurrencyShort(totals.monthlyRent)}
            </div>
            <div className="text-sm text-muted-foreground">
              Monthly HOA Payments
            </div>
            <div className="text-xl font-bold">
              {formatCurrencyShort(totals.hoaExpenses)}
            </div>
            <div className="text-sm text-muted-foreground">
              Investment Income
            </div>
            <div className="text-xl font-bold">
              {formatCurrencyShort(totals.investmentIncome)}
            </div>
          </div>
          <div className="border-t pt-1 bg-muted/10 rounded-b-lg">
            <div className="flex justify-center items-center gap-6">
              <div className="text-base font-medium text-muted-foreground">
                Monthly Cashflow
              </div>
              <div
                className={`text-2xl font-bold ${
                  totals.totalCashflow >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {formatCurrency(totals.totalCashflow)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 sm:grid-cols-1 gap-6">
        <Card className="p-4">
          <h3 className="font-medium text-md mb-2">Top Performing Property</h3>
          {totals.topPerformer ? (
            <div className="space-y-1">
              <p className="text-lg font-bold">
                {totals.topPerformer.formattedAddress}
              </p>
              <p className="text-sm text-muted-foreground">
                Purchased: {formatCurrency(totals.topPerformer.lastSalePrice)}
              </p>
              <p className="text-sm text-muted-foreground">
                Current value:{' '}
                {formatCurrency(totals.topPerformer.price || 0)}
              </p>
              <p className="text-green-500 font-medium">
                {totals.highestAppreciationPercent.toFixed(1)}% appreciation
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No property data available
            </p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-md mb-2">TBD</h3>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-md">Upcoming Tasks:</h3>
          <ScrollArea className="h-36 sm:h-60 md:h-48 ">
            <div className="space-y-3 pr-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium text-sm">{task.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                  {task.amount && (
                    <div className="text-sm font-medium">
                      {formatCurrency(task.amount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 w-full">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assetAllocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }>
                  {assetAllocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-md">Watchlist:</h3>
          <ScrollArea className="h-full"></ScrollArea>
        </Card>
      </div>
    </div>
  );
}
