// read and save redpacket contract deployment json file
const path = require("path");
const fs = require("fs");
const hre = require("hardhat");
const fetch = require("node-fetch");

const currentNamework = hre.network.name;
const DEPLOYMENGT_DIR = path.join(
  __dirname,
  "../scripts/deployment.json",
);

const AddressZero = "0x0000000000000000000000000000000000000000";

async function deployContract(name, params, deployer = undefined) {
  const contract = await hre.ethers.deployContract(name, params, deployer);
  await contract.waitForDeployment();
  // @todo 临时处理
  contract.address = contract.target;
  return contract;
}

const request = (url, params = {}, method = "GET") => {
  let options = {
    method,
  };
  if ("GET" === method) {
    url += "?" + new URLSearchParams(params).toString();
  } else {
    options.body = JSON.stringify(params);
  }

  return fetch(url, options).then((response) => response.json());
};

async function getStatus (bridge, fromChain, toChain, txHash) {
  const result = await request(
    "https://li.quest/v1/status",
    {
      bridge,
      fromChain,
      toChain,
      txHash,
    }
  )

  return result;
}

async function getQuote (fromChain, toChain, fromToken, toToken, fromAmount, slippage, fromAddress, toAddress) {
  const result = await request(
    "https://li.quest/v1/quote",
    {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      slippage,
      fromAddress,
      toAddress,
    }
  )

  return result;
}

/*
 * deployment:
 *   redPacketAddress
 *   redPacketOwner
 *   redPacketID
 *   simpleTokenAddress
 */
function readRedpacketDeployment() {
  if (!fs.existsSync(DEPLOYMENGT_DIR)) return null;
  try {
    return JSON.parse(fs.readFileSync(DEPLOYMENGT_DIR, { encoding: "utf-8" }));
  } catch {
    return null;
  }
}

function saveRedpacketDeployment(payload) {
  let oldData = readRedpacketDeployment();
  if (!oldData) oldData = {};
  fs.writeFileSync(
    DEPLOYMENGT_DIR,
    JSON.stringify({
      ...oldData,
      ...payload,
    }),
    { flag: "w+" },
  );
  return true;
}

async function verifyContract(
  contractNameOrAddress,
  network = hre.network.name,
  constructorArguments = null,
) {
  if (network == "hardhat" || network == "localhost") {
    console.log("hardhat network skip verifyContract");
    return;
  }

  let address;
  if (isAddress(contractNameOrAddress)) {
    address = contractNameOrAddress;
  } else {
    const data = fs.readFileSync(DEPLOYMENGT_DIR, "utf8");
    const addresses = JSON.parse(data);
    address = addresses[contractNameOrAddress];
  }

  if (!address) {
    console.error("verifyContract error: Contract depoloyment not found.");
    return;
  }

  let params = {
    address,
    network,
    constructorArguments: [],
  };
  if (constructorArguments) {
    params.constructorArguments = constructorArguments;
  }

  try {
    await hre.run("verify:verify", params);
    console.log("verifyContract successfully!");
  } catch (e) {
    console.error("verifyContract error:", e);
  }
}

function isAddress(str) {
  return /^0x[a-fA-F0-9]{40}$/.test(str);
}

function hashToken(account) {
  return Buffer.from(
    hre.ethers.utils.solidityPackedKeccak256(["address"], [account]).slice(2),
    "hex",
  );
}

module.exports = {
  AddressZero,
  deployContract,
  DEPLOYMENGT_DIR,
  isAddress,
  verifyContract,
  readRedpacketDeployment,
  saveRedpacketDeployment,
  hashToken,
  request,
  getQuote,
  getStatus,
};
