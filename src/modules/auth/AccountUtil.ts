import { LocalAccount } from "./LocalAccount";
import { Pair, Trio } from "../commons/Collections";
import { AuthlibAccount } from "./AuthlibAccount";
import { Account } from "./Account";
import { ALICORN_ENCRYPTED_DATA_SUFFIX } from "../commons/Constants";
import {
  getActualDataPath,
  loadData,
  saveData,
  saveDataSync,
} from "../config/DataSupport";
import path from "path";
import { decryptByMachine, encryptByMachine } from "../security/Encrypt";
import fs from "fs-extra";
import { MojangAccount } from "./MojangAccount";
import { MicrosoftAccount } from "./MicrosoftAccount";

// Account Prefix
// DO NOT EDIT THIS - VALUES ARE VERY ESSENTIAL
// $AL! Alicorn Local Account
// $MZ! Microsoft Account
// $BJ! Mojang Account
// $AJ! Authlib Injector
enum AccountType {
  MICROSOFT = "$MZ!",
  ALICORN = "$AL!",
  AUTHLIB_INJECTOR = "$AJ!",
  MOJANG = "$BJ!",
}

const ACCOUNT_ROOT = "accounts";

export { AccountType };

export async function saveAccount(a: Account): Promise<boolean> {
  try {
    const fName = a.getAccountIdentifier() + ALICORN_ENCRYPTED_DATA_SUFFIX;
    await saveData(
      path.join(ACCOUNT_ROOT, fName),
      encryptByMachine(decideWhichAccountByCls(a) + a.serialize())
    );
    return true;
  } catch {
    return false;
  }
}

export function saveAccountSync(a: Account): boolean {
  try {
    const fName = a.getAccountIdentifier() + ALICORN_ENCRYPTED_DATA_SUFFIX;
    saveDataSync(
      path.join(ACCOUNT_ROOT, fName),
      encryptByMachine(decideWhichAccountByCls(a) + a.serialize())
    );
    return true;
  } catch {
    return false;
  }
}

export async function getAllAccounts(): Promise<string[]> {
  try {
    return await fs.readdir(getActualDataPath(ACCOUNT_ROOT));
  } catch {
    return [];
  }
}

export async function loadAccount(fName: string): Promise<Account | null> {
  try {
    const s = await loadData(path.join(ACCOUNT_ROOT, fName));
    const deS = decryptByMachine(s);
    const p = decideWhichAccountByHead(deS);
    switch (p.getFirstValue()) {
      case AccountType.AUTHLIB_INJECTOR:
        return loadAJAccount(p.getSecondValue());
      case AccountType.MOJANG:
        return loadMJAccount(p.getSecondValue());
      case AccountType.MICROSOFT:
        return loadMSAccount(p.getSecondValue());
      case AccountType.ALICORN:
      default:
        return loadLocalAccount(p.getSecondValue());
    }
  } catch {
    return null;
  }
}

function loadLocalAccount(obj: Record<string, unknown>): LocalAccount {
  const la = new LocalAccount(String(obj["accountName"] || ""));
  la.lastUsedUsername = String(obj["lastUsedUsername"] || "");
  la.lastUsedAccessToken = String(obj["lastUsedAccessToken"] || "");
  la.lastUsedUUID = String(obj["lastUsedUUID"] || "");
  return la;
}

function loadAJAccount(obj: Record<string, unknown>): AuthlibAccount {
  const la = new AuthlibAccount(
    String(obj["accountName"] || ""),
    String(obj["authServer"] || "")
  );
  la.lastUsedUsername = String(obj["lastUsedUsername"] || "");
  la.lastUsedAccessToken = String(obj["lastUsedAccessToken"] || "");
  la.lastUsedUUID = String(obj["lastUsedUUID"] || "");
  return la;
}

function loadMJAccount(obj: Record<string, unknown>): MojangAccount {
  const la = new MojangAccount(String(obj["accountName"] || ""));
  la.lastUsedUsername = String(obj["lastUsedUsername"] || "");
  la.lastUsedAccessToken = String(obj["lastUsedAccessToken"] || "");
  la.lastUsedUUID = String(obj["lastUsedUUID"] || "");
  return la;
}

function loadMSAccount(obj: Record<string, unknown>): MicrosoftAccount {
  const la = new MicrosoftAccount(String(obj["accountName"] || ""));
  la.lastUsedUsername = String(obj["lastUsedUsername"] || "");
  la.lastUsedAccessToken = String(obj["lastUsedAccessToken"] || "");
  la.lastUsedUUID = String(obj["lastUsedUUID"] || "");
  la.refreshToken = String(obj["refreshToken"] || "");
  return la;
}

function decideWhichAccountByCls(a: Account): AccountType {
  if (a instanceof AuthlibAccount) {
    return AccountType.AUTHLIB_INJECTOR;
  }
  if (a instanceof MojangAccount) {
    return AccountType.MOJANG;
  }
  if (a instanceof MicrosoftAccount) {
    return AccountType.MICROSOFT;
  }
  return AccountType.ALICORN;
}

function decideWhichAccountByHead(
  str: string
): Pair<AccountType, Record<string, unknown>> {
  try {
    let p1;
    const p2 = JSON.parse(str.slice(4));
    switch (str.slice(0, 4)) {
      case AccountType.MICROSOFT:
        p1 = AccountType.MICROSOFT;
        break;
      case AccountType.MOJANG:
        p1 = AccountType.MOJANG;
        break;
      case AccountType.AUTHLIB_INJECTOR:
        p1 = AccountType.AUTHLIB_INJECTOR;
        break;
      case AccountType.ALICORN:
      default:
        p1 = AccountType.ALICORN;
        break;
    }
    return new Pair<AccountType, Record<string, unknown>>(p1, p2);
  } catch {
    return new Pair<AccountType, Record<string, unknown>>(
      AccountType.ALICORN,
      {}
    );
  }
}

export async function removeAccount(fName: string): Promise<void> {
  try {
    await fs.remove(getActualDataPath(path.join(ACCOUNT_ROOT, fName)));
  } catch {}
}

export function copyAccount(aIn: Account | undefined): Account {
  if (aIn === undefined) {
    return new LocalAccount("Demo");
  }
  switch (aIn.type) {
    case AccountType.MICROSOFT:
      return new MicrosoftAccount(aIn.accountName);
    case AccountType.MOJANG: {
      const ac = new MojangAccount(aIn.accountName);
      const ai = aIn as MojangAccount;
      ac.availableProfiles = ai.availableProfiles;
      ac.accountName = ai.accountName;
      ac.lastUsedUUID = ai.lastUsedUUID;
      ac.lastUsedAccessToken = ai.lastUsedAccessToken;
      ac.lastUsedUsername = ai.lastUsedUsername;
      ac.selectedProfile = ai.selectedProfile;
      return ac;
    }
    case AccountType.AUTHLIB_INJECTOR: {
      const ai = aIn as AuthlibAccount;
      const ac = new AuthlibAccount(aIn.accountName, ai.authServer);
      ac.availableProfiles = ai.availableProfiles;
      ac.accountName = ai.accountName;
      ac.lastUsedUUID = ai.lastUsedUUID;
      ac.lastUsedAccessToken = ai.lastUsedAccessToken;
      ac.lastUsedUsername = ai.lastUsedUsername;
      ac.selectedProfile = ai.selectedProfile;
      return ac;
    }
    case AccountType.ALICORN:
    default:
      return new LocalAccount(aIn.accountName);
  }
}

export async function fillAccessData(
  acData: Trio<string, string, string>
): Promise<Trio<string, string, string>> {
  for (const v of acData.get()) {
    if (v.trim().length === 0) {
      return await new LocalAccount("Demo").buildAccessData();
    }
  }
  return acData;
}