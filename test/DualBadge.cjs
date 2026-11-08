const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const hre = require("hardhat");
const { createPublicClient, createWalletClient, custom, decodeErrorResult, decodeEventLog, isAddressEqual, keccak256 } = require("viem");
const { hardhat } = require("viem/chains");

const artifact = JSON.parse(readFileSync("artifacts/DualBadge.json", "utf8"));
const transport = custom(hre.network.provider, { retryCount: 0 });
const client = createPublicClient({ chain: hardhat, transport });
const wallet = createWalletClient({ chain: hardhat, transport });
const uri = "https://example.org/badge.json";
const syntheticKey = Uint8Array.from({ length: 32 }, (_, i) => i + 1);

function reverts(promise, expected) {
  return assert.rejects(promise, (error) => {
    const data = error.message.match(/return data: (0x[\da-f]+)/i)?.[1];
    assert.ok(data, "Expected Hardhat to return revert data");
    assert.equal(decodeErrorResult({ abi: artifact.abi, data }).errorName, expected);
    return true;
  });
}

describe("DualBadge on local Hardhat", function () {
  let admin, alice, bob, contract;
  const read = (functionName, args = []) => client.readContract({ ...contract, functionName, args });
  async function write(account, functionName, args = []) {
    const { request } = await client.simulateContract({ ...contract, account, functionName, args });
    const hash = await wallet.writeContract(request);
    const receipt = await client.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, "success");
    return receipt;
  }
  const create = (cap = 4n, enabled = true) => write(admin, "createBadgeType", [uri, cap, enabled]);
  const mint = (account, id = 1n) => write(account, "mintBadge", [id]);
  const event = (receipt, name) => decodeEventLog({
    abi: artifact.abi, eventName: name, data: receipt.logs[0].data, topics: receipt.logs[0].topics,
  }).args;

  beforeEach(async function () {
    [admin, alice, bob] = await wallet.getAddresses();
    const hash = await wallet.deployContract({ account: admin, abi: artifact.abi, bytecode: artifact.bytecode });
    const { contractAddress } = await client.waitForTransactionReceipt({ hash });
    assert.ok(contractAddress);
    contract = { address: contractAddress, abi: artifact.abi };
  });

  it("lets the owner create a badge and emits the exact attributes", async function () {
    assert.ok(isAddressEqual(await read("owner"), admin));
    assert.deepEqual(event(await create(5n, true), "BadgeTypeCreated"), {
      badgeTypeId: 1n, metadataURI: uri, maxSupply: 5n, enabled: true,
    });
    assert.deepEqual(await read("getBadgeType", [1n]), { metadataURI: uri, maxSupply: 5n, minted: 0n, enabled: true });
    assert.equal(await read("badgeTypeCount"), 1n);
  });

  it("rejects unauthorized create and update", async function () {
    await create();
    await reverts(write(alice, "createBadgeType", [uri, 1n, true]), "OwnableUnauthorizedAccount");
    await reverts(write(alice, "setBadgeTypeEnabled", [1n, false]), "OwnableUnauthorizedAccount");
    assert.equal((await read("getBadgeType", [1n])).enabled, true);
  });

  it("credits the caller and emits BadgeMinted", async function () {
    await create();
    const args = event(await mint(alice), "BadgeMinted");
    assert.equal(args.badgeTypeId, 1n);
    assert.ok(isAddressEqual(args.account, alice));
    assert.equal(await read("hasBadge", [1n, alice]), true);
    assert.equal(await read("hasBadge", [1n, bob]), false);
    assert.equal(await read("totalMinted"), 1n);
  });

  it("rejects duplicates per account per type and keeps accurate counts", async function () {
    await create();
    await create();
    await mint(alice);
    await reverts(mint(alice), "AlreadyMinted");
    await mint(bob);
    await mint(alice, 2n);
    assert.equal(await read("totalMinted"), 3n);
    assert.equal((await read("getBadgeType", [1n])).minted, 2n);
    assert.equal((await read("getBadgeType", [2n])).minted, 1n);
    assert.equal(await read("hasBadge", [2n, alice]), true);
  });

  it("rejects disabled claims and emits the owner update", async function () {
    await create(4n, false);
    await reverts(mint(alice), "BadgeDisabled");
    const receipt = await write(admin, "setBadgeTypeEnabled", [1n, true]);
    assert.deepEqual(event(receipt, "BadgeTypeUpdated"), { badgeTypeId: 1n, enabled: true });
    await mint(alice);
    await write(admin, "setBadgeTypeEnabled", [1n, false]);
    await reverts(mint(bob), "BadgeDisabled");
    assert.equal(await read("hasBadge", [1n, alice]), true);
  });

  it("enforces the cap without assigning ownership to the rejected caller", async function () {
    await create(1n);
    await mint(alice);
    await reverts(mint(bob), "SupplyExhausted");
    assert.equal(await read("totalMinted"), 1n);
    assert.equal(await read("hasBadge", [1n, bob]), false);
  });

  it("rejects nonexistent IDs and invalid badge definitions", async function () {
    await reverts(create(0n), "InvalidSupply");
    await reverts(write(admin, "createBadgeType", ["", 1n, true]), "InvalidMetadataURI");
    await reverts(write(admin, "createBadgeType", ["x".repeat(257), 1n, true]), "InvalidMetadataURI");
    await reverts(read("getBadgeType", [0n]), "InvalidBadgeType");
    await reverts(read("hasBadge", [1n, alice]), "InvalidBadgeType");
    await reverts(mint(alice, 2n), "InvalidBadgeType");
    await reverts(write(admin, "setBadgeTypeEnabled", [1n, true]), "InvalidBadgeType");
    assert.equal(await read("badgeTypeCount"), 0n);
  });

  it("accepts a synthetic sender in shared storage and denies admin powers (impersonated locally)", async function () {
    const { syntheticAddress } = await import("@rome-protocol/sdk");
    const synthetic = syntheticAddress(syntheticKey);
    assert.equal(synthetic.toLowerCase(), "0x" + keccak256(syntheticKey).slice(-40));
    await create();
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [synthetic] });
    await hre.network.provider.request({ method: "hardhat_setBalance", params: [synthetic, "0x100000000000000000"] });
    try {
      await reverts(write(synthetic, "setBadgeTypeEnabled", [1n, false]), "OwnableUnauthorizedAccount");
      await mint(synthetic);
      await mint(alice);
      assert.equal(await read("hasBadge", [1n, synthetic]), true);
      assert.equal(await read("hasBadge", [1n, alice]), true);
      assert.equal(await read("totalMinted"), 2n);
    } finally {
      await hre.network.provider.request({ method: "hardhat_stopImpersonatingAccount", params: [synthetic] });
    }
  });

  it("uses two-step ownership transfer and retains an administrator", async function () {
    await reverts(write(admin, "renounceOwnership"), "OwnershipRequired");
    await write(admin, "transferOwnership", [alice]);
    await reverts(write(bob, "acceptOwnership"), "OwnableUnauthorizedAccount");
    assert.ok(isAddressEqual(await read("owner"), admin));
    await write(alice, "acceptOwnership");
    await reverts(create(), "OwnableUnauthorizedAccount");
    await write(alice, "createBadgeType", [uri, 1n, true]);
  });
});
