"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { formToObject, useApi } from "@/hooks/use-api";

export function SettingsForm({ settings }) {
  const { request, pending } = useApi();

  async function onSubmit(event) {
    event.preventDefault();
    await request("/api/settings", { method: "PUT", body: formToObject(event.currentTarget), success: "Settings saved" }).catch(() => {});
  }

  const field = (name, label, props = {}, hint) => (
    <FormField label={label} htmlFor={`s-${name}`} hint={hint}>
      <Input id={`s-${name}`} name={name} defaultValue={settings[name]} {...props} />
    </FormField>
  );

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Property</CardTitle>
          <CardDescription>Shown in the sidebar and on invoices.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field("hotelName", "Hotel name", { required: true })}</div>
          <div className="sm:col-span-2">{field("address", "Address")}</div>
          {field("phone", "Phone")}
          {field("email", "Email", { type: "email" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Billing & policies</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("currency", "Currency", { maxLength: 3, required: true, className: "uppercase" }, "ISO code, e.g. INR (₹), USD, AED, PKR.")}
          {field("taxRate", "Tax rate (%)", { type: "number", min: 0, max: 100, step: "0.01", required: true }, "Applied to room and extras on every folio.")}
          {field("checkInTime", "Standard check-in", { type: "time", required: true })}
          {field("checkOutTime", "Standard check-out", { type: "time", required: true })}
          {field(
            "pointsPerCurrencyUnit",
            "Loyalty points per unit paid",
            { type: "number", min: 0, step: "0.1", required: true },
            "Awarded to the guest when they check out."
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
