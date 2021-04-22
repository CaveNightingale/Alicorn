import {
  Box,
  createStyles,
  Fab,
  LinearProgress,
  makeStyles,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@material-ui/core";
import { GameProfile } from "../modules/profile/GameProfile";
import { MinecraftContainer } from "../modules/container/MinecraftContainer";
import React, { useEffect, useRef, useState } from "react";
import { randsl, tr } from "./Translator";
import { useParams } from "react-router";
import { loadProfile } from "../modules/profile/ProfileLoader";
import { getContainer } from "../modules/container/ContainerUtil";
import { MicrosoftAccount } from "../modules/auth/MicrosoftAccount";
import { getJavaRunnable, getLastUsedJavaHome } from "../modules/java/JInfo";
import { FlightTakeoff } from "@material-ui/icons";
import objectHash from "object-hash";
import {
  ensureAllAssets,
  ensureAssetsIndex,
  ensureLibraries,
  ensureNatives,
} from "../modules/launch/Ensurance";
import { launchProfile } from "../modules/launch/LaunchPad";
import EventEmitter from "events";
import { PROCESS_LOG_GATE } from "../modules/commons/Constants";

// UNCHECKED

const useStyles = makeStyles((theme) =>
  createStyles({
    stepper: {
      backgroundColor: theme.palette.secondary.light,
    },
    textSP: {
      color: theme.palette.secondary.main,
    },
    text: {
      fontSize: "medium",
      flexGrow: 1,
      color: theme.palette.secondary.main,
    },
    root: {
      marginLeft: theme.spacing(4),
      textAlign: "center",
    },
    primaryText: {
      flexGrow: 1,
      color: theme.palette.primary.main,
    },
  })
);

export function ReadyToLaunch(): JSX.Element {
  const [coreProfile, setProfile] = useState(new GameProfile({}));
  const [profileLoadedBit, setLoaded] = useState(0);
  const { id, container } = useParams<{ id: string; container: string }>();
  const mounted = useRef<boolean>();

  useEffect(() => {
    mounted.current = true;
    if (!profileLoadedBit) {
      (async () => {
        try {
          const d = await loadProfile(id, getContainer(container));
          if (mounted.current) {
            setProfile(d);
            setLoaded(1);
          }
        } catch {
          if (mounted.current) {
            setLoaded(2);
          }
        }
      })();
    }
    return () => {
      mounted.current = false;
    };
  });
  // TODO add java executable and account choosing
  return profileLoadedBit === 1 ? (
    <Launching profile={coreProfile} container={getContainer(container)} />
  ) : (
    <LinearProgress color={"secondary"} style={{ width: "80%" }} />
  );
}

function Launching(props: {
  profile: GameProfile;
  container: MinecraftContainer;
}): JSX.Element {
  const classes = useStyles();
  const [runID, setID] = useState("");
  const [status, setStatus] = useState(LaunchingStatus.PENDING);
  const [hint, setHint] = useState(randsl("ReadyToLaunch.WaitingText"));
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setHint(randsl("ReadyToLaunch.WaitingText"));
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  });
  const LAUNCH_STEPS = [
    "Pending",
    "PerformingAuth",
    "CheckingLibs",
    "CheckingAssets",
    "GeneratingArgs",
    "Finished",
  ];
  const REV_LAUNCH_STEPS = {
    Pending: 0,
    PerformingAuth: 1,
    CheckingLibs: 2,
    CheckingAssets: 3,
    GeneratingArgs: 4,
    Finished: 5,
  };
  return (
    <Box className={classes.root}>
      <Typography className={classes.text} gutterBottom>
        {tr("ReadyToLaunch.Hint") + " " + props.profile.id}
      </Typography>
      <Typography variant={"h6"} className={classes.primaryText} gutterBottom>
        {tr("ReadyToLaunch.Status." + status)}
        {status === LaunchingStatus.FINISHED ? " " + runID : ""}
        {status !== LaunchingStatus.PENDING &&
        status !== LaunchingStatus.FINISHED
          ? ""
          : ""}
      </Typography>
      <Stepper className={classes.stepper} activeStep={activeStep}>
        {LAUNCH_STEPS.map((s) => {
          return (
            <Step key={objectHash(s)}>
              <StepLabel>
                <Typography className={classes.textSP}>
                  {tr("ReadyToLaunch.Status.Short." + s)}
                </Typography>
              </StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {status === LaunchingStatus.PENDING ||
      status === LaunchingStatus.FINISHED ? (
        ""
      ) : (
        <LinearProgress color={"secondary"} />
      )}
      {/* Insert Here */}
      <Typography className={classes.text} gutterBottom>
        {hint}
      </Typography>
      <Fab
        color={"primary"}
        disabled={
          status !== LaunchingStatus.PENDING &&
          status !== LaunchingStatus.FINISHED
        }
        onClick={async () => {
          await startBoot(
            (st) => {
              setStatus(st);
              setActiveStep(REV_LAUNCH_STEPS[st]);
            },
            props.profile,
            props.container,
            setID
          );
        }}
      >
        <FlightTakeoff />
      </Fab>
    </Box>
  );
}

// Account unknown
// TODO support account choose
async function startBoot(
  setStatus: (status: LaunchingStatus) => void,
  profile: GameProfile,
  container: MinecraftContainer,
  setID: (id: string) => void
): Promise<void> {
  // TODO wrong profile
  console.log(profile);
  const jRunnable = getJavaRunnable(getLastUsedJavaHome());
  setStatus(LaunchingStatus.ACCOUNT_AUTHING);
  // Virtual
  const account = new MicrosoftAccount("");
  await account.performAuth("");
  setStatus(LaunchingStatus.LIBRARIES_FILLING);
  await ensureLibraries(profile, container);
  await ensureNatives(profile, container);
  setStatus(LaunchingStatus.ASSETS_FILLING);
  await ensureAssetsIndex(profile, container);
  await ensureAllAssets(profile, container);
  setStatus(LaunchingStatus.ARGS_GENERATING);
  const em = new EventEmitter();
  const runID = launchProfile(
    profile,
    container,
    jRunnable,
    await account.buildAccessData(),
    em,
    {
      useAj: false,
      useServer: false,
    }
  );
  setID(runID);
  setStatus(LaunchingStatus.FINISHED);
  em.on(PROCESS_LOG_GATE, (d) => {
    console.log(d);
  });
}

enum LaunchingStatus {
  PENDING = "Pending",
  ACCOUNT_AUTHING = "PerformingAuth",
  LIBRARIES_FILLING = "CheckingLibs",
  ASSETS_FILLING = "CheckingAssets",
  ARGS_GENERATING = "GeneratingArgs",
  FINISHED = "Finished",
}
