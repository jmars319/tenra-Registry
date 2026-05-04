import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl
  })
});
const defaultOrganizationName = "tenra Registry Operations";
const defaultOrganizationSlug = "registry-ops";

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function main() {
  const organization = await prisma.organization.upsert({
    where: {
      slug: defaultOrganizationSlug
    },
    update: {
      name: defaultOrganizationName,
      status: "ACTIVE"
    },
    create: {
      name: defaultOrganizationName,
      slug: defaultOrganizationSlug,
      status: "ACTIVE"
    }
  });

  const sampleCustomer = await prisma.customer.upsert({
    where: {
      id: `seed-customer-${organization.id}`
    },
    update: {
      name: "Harbor Logistics",
      companyName: "Harbor Logistics LLC",
      email: "ops@harbor-logistics.test",
      phone: "555-0100",
      billingStreet1: "101 Port Avenue",
      billingCity: "Savannah",
      billingState: "GA",
      billingPostalCode: "31401",
      billingCountry: "US",
      notes: "Seed customer for local development.",
      status: "ACTIVE"
    },
    create: {
      id: `seed-customer-${organization.id}`,
      organizationId: organization.id,
      name: "Harbor Logistics",
      companyName: "Harbor Logistics LLC",
      email: "ops@harbor-logistics.test",
      phone: "555-0100",
      billingStreet1: "101 Port Avenue",
      billingCity: "Savannah",
      billingState: "GA",
      billingPostalCode: "31401",
      billingCountry: "US",
      notes: "Seed customer for local development.",
      status: "ACTIVE"
    }
  });

  const activeAsset = await prisma.asset.upsert({
    where: {
      organizationId_assetCode: {
        organizationId: organization.id,
        assetCode: "CTR-1001"
      }
    },
    update: {
      name: "20 ft storage container",
      category: "UNIT",
      status: "ASSIGNED",
      currentLocation: "Harbor Logistics overflow lot",
      homeLocation: "Main yard row A",
      sizeLabel: "20 ft",
      unitType: "standard steel container",
      condition: "rent-ready",
      notes: "Seed container with an active rental."
    },
    create: {
      organizationId: organization.id,
      assetCode: "CTR-1001",
      name: "20 ft storage container",
      category: "UNIT",
      status: "ASSIGNED",
      currentLocation: "Harbor Logistics overflow lot",
      homeLocation: "Main yard row A",
      sizeLabel: "20 ft",
      unitType: "standard steel container",
      condition: "rent-ready",
      notes: "Seed container with an active rental."
    }
  });

  await prisma.asset.upsert({
    where: {
      organizationId_assetCode: {
        organizationId: organization.id,
        assetCode: "CTR-1002"
      }
    },
    update: {
      name: "40 ft high cube container",
      category: "UNIT",
      status: "AVAILABLE",
      currentLocation: "Main yard",
      homeLocation: "Main yard row B",
      sizeLabel: "40 ft",
      unitType: "high cube",
      condition: "needs sweep-out",
      notes: "Seed unit kept available for rental testing."
    },
    create: {
      organizationId: organization.id,
      assetCode: "CTR-1002",
      name: "40 ft high cube container",
      category: "UNIT",
      status: "AVAILABLE",
      currentLocation: "Main yard",
      homeLocation: "Main yard row B",
      sizeLabel: "40 ft",
      unitType: "high cube",
      condition: "needs sweep-out",
      notes: "Seed unit kept available for rental testing."
    }
  });

  const activeRental = await prisma.assignment.upsert({
    where: {
      id: `seed-assignment-${organization.id}`
    },
    update: {
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assetId: activeAsset.id,
      startDate: dateOnly("2026-03-01"),
      endDate: null,
      billingCadence: "MONTHLY",
      rateInCents: 185000,
      status: "ACTIVE",
      siteName: "Harbor Logistics overflow lot",
      siteStreet1: "500 Dockside Road",
      siteCity: "Savannah",
      siteState: "GA",
      sitePostalCode: "31401",
      deliveryScheduledFor: dateOnly("2026-03-01"),
      deliveredOn: dateOnly("2026-03-01"),
      pickupRequestedOn: null,
      pickedUpOn: null,
      placementNotes: "Place container along the east fence with doors facing the warehouse.",
      notes: "Seed active rental for the default organization."
    },
    create: {
      id: `seed-assignment-${organization.id}`,
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assetId: activeAsset.id,
      startDate: dateOnly("2026-03-01"),
      endDate: null,
      billingCadence: "MONTHLY",
      rateInCents: 185000,
      status: "ACTIVE",
      siteName: "Harbor Logistics overflow lot",
      siteStreet1: "500 Dockside Road",
      siteCity: "Savannah",
      siteState: "GA",
      sitePostalCode: "31401",
      deliveryScheduledFor: dateOnly("2026-03-01"),
      deliveredOn: dateOnly("2026-03-01"),
      pickupRequestedOn: null,
      pickedUpOn: null,
      placementNotes: "Place container along the east fence with doors facing the warehouse.",
      notes: "Seed active rental for the default organization."
    }
  });

  await prisma.receivableEntry.upsert({
    where: {
      id: `seed-receivable-rent-${organization.id}`
    },
    update: {
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "CHARGE",
      status: "POSTED",
      description: "Monthly container rent",
      effectiveDate: dateOnly("2026-04-01"),
      dueDate: dateOnly("2026-04-10"),
      amountInCents: 185000,
      paymentMethod: null,
      reference: "APR-RENT",
      notes: "Seed rental charge."
    },
    create: {
      id: `seed-receivable-rent-${organization.id}`,
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "CHARGE",
      status: "POSTED",
      description: "Monthly container rent",
      effectiveDate: dateOnly("2026-04-01"),
      dueDate: dateOnly("2026-04-10"),
      amountInCents: 185000,
      paymentMethod: null,
      reference: "APR-RENT",
      notes: "Seed rental charge."
    }
  });

  await prisma.receivableEntry.upsert({
    where: {
      id: `seed-receivable-payment-${organization.id}`
    },
    update: {
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "PAYMENT",
      status: "POSTED",
      description: "Customer payment",
      effectiveDate: dateOnly("2026-04-12"),
      dueDate: null,
      amountInCents: -100000,
      paymentMethod: "check",
      reference: "CHK-1042",
      notes: "Partial payment seed entry."
    },
    create: {
      id: `seed-receivable-payment-${organization.id}`,
      organizationId: organization.id,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "PAYMENT",
      status: "POSTED",
      description: "Customer payment",
      effectiveDate: dateOnly("2026-04-12"),
      dueDate: null,
      amountInCents: -100000,
      paymentMethod: "check",
      reference: "CHK-1042",
      notes: "Partial payment seed entry."
    }
  });

  const templates = [
    {
      id: `seed-template-rental-${organization.id}`,
      type: "RENTAL_AGREEMENT",
      name: "Standard container rental agreement",
      subject: "Container rental agreement for {{customer.name}}",
      body:
        "Customer: {{customer.name}}\nUnit: {{unit.assetCode}}\nSite: {{rental.siteAddress}}\nRate: {{rental.rate}}\n\nBusiness-approved rental terms go here.",
      mergeFields: ["customer.name", "unit.assetCode", "rental.siteAddress", "rental.rate"]
    },
    {
      id: `seed-template-delivery-${organization.id}`,
      type: "DELIVERY_TICKET",
      name: "Container delivery ticket",
      subject: "Delivery ticket for {{unit.assetCode}}",
      body:
        "Deliver {{unit.assetCode}} to {{rental.siteAddress}}.\nPlacement notes: {{rental.placementNotes}}\nDriver notes: ____________________",
      mergeFields: ["unit.assetCode", "rental.siteAddress", "rental.placementNotes"]
    },
    {
      id: `seed-template-receipt-${organization.id}`,
      type: "PAYMENT_RECEIPT",
      name: "Payment receipt",
      subject: "Payment receipt from {{organization.name}}",
      body:
        "Received from {{customer.name}}: {{payment.amount}}\nReference: {{payment.reference}}\nRemaining balance: {{balance.amount}}",
      mergeFields: ["customer.name", "payment.amount", "payment.reference", "balance.amount"]
    }
  ];

  for (const template of templates) {
    await prisma.documentTemplate.upsert({
      where: {
        id: template.id
      },
      update: {
        organizationId: organization.id,
        type: template.type,
        name: template.name,
        subject: template.subject,
        body: template.body,
        mergeFields: template.mergeFields,
        printEnabled: true,
        emailEnabled: true,
        active: true
      },
      create: {
        id: template.id,
        organizationId: organization.id,
        type: template.type,
        name: template.name,
        subject: template.subject,
        body: template.body,
        mergeFields: template.mergeFields,
        printEnabled: true,
        emailEnabled: true,
        active: true
      }
    });
  }

  await prisma.generatedDocument.upsert({
    where: {
      id: `seed-document-delivery-${organization.id}`
    },
    update: {
      organizationId: organization.id,
      templateId: `seed-template-delivery-${organization.id}`,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "DELIVERY_TICKET",
      status: "DRAFT",
      title: "Delivery ticket - Harbor Logistics",
      subject: "Delivery ticket for CTR-1001",
      body:
        "Deliver CTR-1001 to Harbor Logistics overflow lot.\n\nAddress:\n500 Dockside Road\nSavannah, GA 31401\n\nPlacement notes:\nPlace container along the east fence with doors facing the warehouse.\n\nDriver notes:\n\nSignature: ______________________________",
      recipientEmail: sampleCustomer.email,
      printedAt: null,
      emailedAt: null
    },
    create: {
      id: `seed-document-delivery-${organization.id}`,
      organizationId: organization.id,
      templateId: `seed-template-delivery-${organization.id}`,
      customerId: sampleCustomer.id,
      assignmentId: activeRental.id,
      assetId: activeAsset.id,
      type: "DELIVERY_TICKET",
      status: "DRAFT",
      title: "Delivery ticket - Harbor Logistics",
      subject: "Delivery ticket for CTR-1001",
      body:
        "Deliver CTR-1001 to Harbor Logistics overflow lot.\n\nAddress:\n500 Dockside Road\nSavannah, GA 31401\n\nPlacement notes:\nPlace container along the east fence with doors facing the warehouse.\n\nDriver notes:\n\nSignature: ______________________________",
      recipientEmail: sampleCustomer.email,
      printedAt: null,
      emailedAt: null
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
