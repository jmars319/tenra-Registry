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
const defaultOrganizationName = "Registry by Tenra Operations";
const defaultOrganizationSlug = "registry-ops";

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

// Seed organization boundary
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

  // Seed inventory boundary
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

  // Seed rental boundary
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

  // Seed receivable boundary
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

  // Seed document template boundary
  const templates = [
    {
      id: `seed-template-rental-${organization.id}`,
      type: "RENTAL_AGREEMENT",
      name: "Standard container rental agreement",
      subject: "Container rental agreement for {{customer.name}}",
      body:
        "{{organization.name}}\n\nRental agreement\n\nCustomer: {{customer.name}}\nPhone: {{customer.phone}}\nUnit: {{unit.assetCode}} {{unit.size}}\nStart date: {{rental.startDate}}\nRate: {{rental.rate}}\nRental site:\n{{rental.siteAddress}}\n\nPlacement notes:\n{{rental.placementNotes}}\n\nThe customer agrees to rent the listed portable storage container at the stated rate. The customer is responsible for access to the site, ordinary care of the unit while rented, and payment of posted charges. Any special terms can be added here before printing or emailing.\n\nCustomer signature: ______________________________\nDate: ____________________",
      mergeFields: [
        "organization.name",
        "customer.name",
        "customer.phone",
        "unit.assetCode",
        "unit.size",
        "rental.startDate",
        "rental.rate",
        "rental.siteAddress",
        "rental.placementNotes"
      ]
    },
    {
      id: `seed-template-delivery-${organization.id}`,
      type: "DELIVERY_TICKET",
      name: "Container delivery ticket",
      subject: "Delivery ticket for {{unit.assetCode}}",
      body:
        "Delivery ticket\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}} {{unit.size}}\nDelivery site:\n{{rental.siteAddress}}\n\nPlacement notes:\n{{rental.placementNotes}}\n\nDriver notes:\n\nDelivered by: ______________________________\nCustomer signature: ______________________________\nDate: ____________________",
      mergeFields: ["customer.name", "unit.assetCode", "unit.size", "rental.siteAddress", "rental.placementNotes"]
    },
    {
      id: `seed-template-pickup-${organization.id}`,
      type: "PICKUP_TICKET",
      name: "Container pickup ticket",
      subject: "Pickup ticket for {{unit.assetCode}}",
      body:
        "Pickup ticket\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nPickup site:\n{{rental.siteAddress}}\n\nSite and access notes:\n{{rental.placementNotes}}\n\nCondition at pickup:\n\nDriver notes:\n\nPicked up by: ______________________________\nDate: ____________________",
      mergeFields: ["unit.assetCode", "rental.siteAddress", "rental.placementNotes"]
    },
    {
      id: `seed-template-condition-${organization.id}`,
      type: "CONDITION_REPORT",
      name: "Container condition report",
      subject: "Condition report for {{unit.assetCode}}",
      body:
        "Condition report\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nRecorded condition: {{unit.condition}}\nLocation:\n{{rental.siteAddress}}\n\nExterior condition:\n\nInterior condition:\n\nDoor and lock condition:\n\nPhotos attached: Yes / No\n\nReviewed by: ______________________________\nDate: ____________________",
      mergeFields: ["customer.name", "unit.assetCode", "unit.condition", "rental.siteAddress"]
    },
    {
      id: `seed-template-receipt-${organization.id}`,
      type: "PAYMENT_RECEIPT",
      name: "Payment receipt",
      subject: "Payment receipt from {{organization.name}}",
      body:
        "{{organization.name}}\n\nPayment receipt\n\nReceived from: {{customer.name}}\nAmount: {{payment.amount}}\nReference: {{payment.reference}}\nRemaining balance: {{balance.amount}}\n\nReceived by: ______________________________\nDate: ____________________",
      mergeFields: ["customer.name", "payment.amount", "payment.reference", "balance.amount"]
    },
    {
      id: `seed-template-past-due-${organization.id}`,
      type: "PAST_DUE_NOTICE",
      name: "Past-due balance notice",
      subject: "Past-due balance for {{customer.name}}",
      body:
        "{{organization.name}}\n\nPast-due balance notice\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nCurrent balance: {{balance.amount}}\nPast due: {{balance.pastDue}}\n\nPlease contact the office to bring the account current or confirm payment arrangements.\n\nOffice notes:\n\nThank you.",
      mergeFields: ["organization.name", "customer.name", "unit.assetCode", "balance.amount", "balance.pastDue"]
    },
    {
      id: `seed-template-deposit-${organization.id}`,
      type: "DEPOSIT_RECEIPT",
      name: "Deposit receipt",
      subject: "Deposit receipt from {{organization.name}}",
      body:
        "{{organization.name}}\n\nDeposit receipt\n\nReceived from: {{customer.name}}\nAmount: {{payment.amount}}\nReference: {{payment.reference}}\nRemaining balance: {{balance.amount}}\n\nReceived by: ______________________________\nDate: ____________________",
      mergeFields: ["organization.name", "customer.name", "payment.amount", "payment.reference", "balance.amount"]
    },
    {
      id: `seed-template-letter-${organization.id}`,
      type: "GENERAL_LETTER",
      name: "Customer letter",
      subject: "Message from {{organization.name}}",
      body:
        "{{organization.name}}\n\nTo: {{customer.name}}\n{{customer.companyName}}\n\nRe: {{unit.assetCode}}\n\nWrite the office message here.\n\nCurrent balance: {{balance.amount}}\n\nThank you.",
      mergeFields: ["organization.name", "customer.name", "customer.companyName", "unit.assetCode", "balance.amount"]
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

  // Seed generated document boundary
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
