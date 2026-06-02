import path from "node:path";

process.loadEnvFile(path.resolve("../../.env"));

const { db } = await import("../src/server/db");
const {
  createAssignment,
  createAsset,
  createCustomer,
  createReceivableEntry,
  getDefaultOrganization,
  getCustomerDetail,
  transitionAssignmentStatus
} = await import("../src/server/registry-data");

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFailure(action: () => Promise<unknown>, message: string): Promise<void> {
  let failed = false;

  try {
    await action();
  } catch {
    failed = true;
  }

  if (!failed) {
    throw new Error(message);
  }
}

async function readAssetStatus(assetId: string): Promise<string> {
  const asset = await db.asset.findUnique({
    where: {
      id: assetId
    },
    select: {
      status: true
    }
  });

  assertCondition(asset, "Verification asset is missing.");

  return asset.status;
}

const suffix = `${Date.now()}`;
const startDate = "2026-03-14";
const organization = await getDefaultOrganization();

let customerId: string | undefined;
let assetId: string | undefined;

try {
  const customer = await createCustomer({
    organizationId: organization.id,
    name: `Verify Customer ${suffix}`,
    email: `verify-${suffix}@registry.test`
  });

  customerId = customer.id;

  const asset = await createAsset({
    organizationId: organization.id,
    assetCode: `VERIFY-${suffix}`,
    name: `Verification Container ${suffix}`,
    category: "unit",
    sizeLabel: "20 ft",
    unitType: "standard",
    condition: "rent-ready",
    currentLocation: "Verification yard"
  });

  assetId = asset.id;

  const assignmentOne = await createAssignment({
    organizationId: organization.id,
    customerId: customer.id,
    assetId: asset.id,
    startDate,
    billingCadence: "monthly",
    rateInCents: 250000,
    status: "active",
    siteName: "Verification site",
    siteStreet1: "100 Test Lane",
    siteCity: "Savannah",
    siteState: "GA",
    sitePostalCode: "31401",
    deliveryScheduledFor: startDate,
    placementNotes: "Drop doors facing the driveway."
  });

  await createReceivableEntry({
    organizationId: organization.id,
    customerId: customer.id,
    assignmentId: assignmentOne.id,
    type: "charge",
    description: "Verification rental charge",
    effectiveDate: startDate,
    dueDate: startDate,
    amountInCents: 250000
  });

  await createReceivableEntry({
    organizationId: organization.id,
    customerId: customer.id,
    assignmentId: assignmentOne.id,
    type: "payment",
    description: "Verification payment",
    effectiveDate: startDate,
    amountInCents: 100000,
    paymentMethod: "test"
  });

  const customerDetail = await getCustomerDetail(customer.id);
  assertCondition(customerDetail, "Customer detail should load after receivable entries are created.");
  assertCondition(
    customerDetail.balance.balanceInCents === 150000,
    "Customer balance should reflect charges minus payments."
  );

  assertCondition((await readAssetStatus(asset.id)) === "ASSIGNED", "Asset should be assigned after activation.");

  await expectFailure(
    () =>
      createAssignment({
        organizationId: organization.id,
        customerId: customer.id,
        assetId: asset.id,
        startDate,
        billingCadence: "monthly",
        rateInCents: 275000,
        status: "active"
      }),
    "The system allowed a second active assignment on the same asset."
  );

  await transitionAssignmentStatus({
    organizationId: organization.id,
    assignmentId: assignmentOne.id,
    nextStatus: "completed"
  });

  assertCondition((await readAssetStatus(asset.id)) === "AVAILABLE", "Asset should be available after completion.");

  await expectFailure(
    () =>
      transitionAssignmentStatus({
        organizationId: organization.id,
        assignmentId: assignmentOne.id,
        nextStatus: "cancelled"
      }),
    "The system allowed a completed assignment to be changed again."
  );

  const assignmentTwo = await createAssignment({
    organizationId: organization.id,
    customerId: customer.id,
    assetId: asset.id,
    startDate,
    billingCadence: "weekly",
    rateInCents: 85000,
    status: "draft"
  });

  assertCondition(
    (await readAssetStatus(asset.id)) === "AVAILABLE",
    "Draft assignments should not occupy the asset."
  );

  await transitionAssignmentStatus({
    organizationId: organization.id,
    assignmentId: assignmentTwo.id,
    nextStatus: "active"
  });

  assertCondition((await readAssetStatus(asset.id)) === "ASSIGNED", "Asset should be assigned after draft activation.");

  await transitionAssignmentStatus({
    organizationId: organization.id,
    assignmentId: assignmentTwo.id,
    nextStatus: "cancelled"
  });

  assertCondition((await readAssetStatus(asset.id)) === "AVAILABLE", "Asset should be available after cancellation.");

  const assignmentThree = await createAssignment({
    organizationId: organization.id,
    customerId: customer.id,
    assetId: asset.id,
    startDate,
    billingCadence: "daily",
    rateInCents: 12000,
    status: "active"
  });

  assertCondition(
    (await readAssetStatus(asset.id)) === "ASSIGNED",
    "Asset should be reusable for a new active assignment after release."
  );

  const assignmentFour = await createAssignment({
    organizationId: organization.id,
    customerId: customer.id,
    assetId: asset.id,
    startDate,
    billingCadence: "custom",
    rateInCents: 199900,
    status: "draft"
  });

  await transitionAssignmentStatus({
    organizationId: organization.id,
    assignmentId: assignmentFour.id,
    nextStatus: "cancelled"
  });

  assertCondition(
    (await readAssetStatus(asset.id)) === "ASSIGNED",
    "Cancelling a draft assignment should not release an asset held by another active assignment."
  );

  await transitionAssignmentStatus({
    organizationId: organization.id,
    assignmentId: assignmentThree.id,
    nextStatus: "completed"
  });

  assertCondition(
    (await readAssetStatus(asset.id)) === "AVAILABLE",
    "Asset should return to available after the final active assignment is completed."
  );

  console.log("Registry by Tenra DB lifecycle flow passed.");
} finally {
  if (customerId) {
    await db.receivableEntry.deleteMany({
      where: {
        customerId
      }
    });
  }

  if (assetId) {
    await db.assignment.deleteMany({
      where: {
        assetId
      }
    });
  }

  if (assetId) {
    await db.asset.delete({
      where: {
        id: assetId
      }
    });
  }

  if (customerId) {
    await db.customer.delete({
      where: {
        id: customerId
      }
    });
  }

  await db.$disconnect();
}
