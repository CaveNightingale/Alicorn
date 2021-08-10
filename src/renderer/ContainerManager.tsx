import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import {
  Add,
  Eject,
  FolderOpen,
  Input,
  LayersClear,
  LinkOff,
} from "@material-ui/icons";
import { ipcRenderer, shell } from "electron";
import fs from "fs-extra";
import path from "path";
import React, { useEffect, useRef, useState } from "react";
import { isFileExist } from "../modules/commons/FileUtil";
import { scanCoresIn } from "../modules/container/ContainerScanner";
import {
  getAllContainerPaths,
  getAllContainers,
  getContainer,
  isMounted,
  mount,
  unmount,
} from "../modules/container/ContainerUtil";
import {
  clearContainer,
  createNewContainer,
  unlinkContainer,
} from "../modules/container/ContainerWrapper";
import { MinecraftContainer } from "../modules/container/MinecraftContainer";
import { isSharedContainer } from "../modules/container/SharedFiles";
import { OperatingHint } from "./OperatingHint";
import { useCardStyles, useInputStyles, usePadStyles } from "./Stylex";
import { tr } from "./Translator";

export function setContainerListDirty(): void {
  window.dispatchEvent(new CustomEvent("setContainerListDirty"));
}

export function ContainerManager(): JSX.Element {
  const isEleMounted = useRef<boolean>();
  const [refreshTrigger, triggerRefresh] = useState(true);
  const [operating, setOpen] = useState(false);
  const [opening, setCreating] = useState(false);
  const classes2 = usePadStyles();
  useEffect(() => {
    isEleMounted.current = true;
    const fun = () => {
      if (isEleMounted.current) {
        triggerRefresh(!refreshTrigger);
      }
    };
    window.addEventListener("setContainerListDirty", fun);
    return () => {
      window.removeEventListener("setContainerListDirty", fun);
      isEleMounted.current = false;
    };
  });
  const allContainers = getAllContainers();
  return (
    <Box className={classes2.para}>
      <OperatingHint open={operating} />
      <AddNewContainer
        setOperate={(s) => {
          if (isEleMounted.current) {
            setOpen(s);
          }
        }}
        open={opening}
        closeFunc={() => {
          if (isEleMounted.current) {
            setCreating(false);
          }
        }}
      />
      <Box style={{ textAlign: "right", marginRight: "18%" }}>
        <Tooltip title={tr("ContainerManager.Add")}>
          <IconButton
            color={"inherit"}
            onClick={() => {
              if (isEleMounted.current) {
                setCreating(true);
              }
            }}
          >
            <Add />
          </IconButton>
        </Tooltip>
      </Box>
      {allContainers.map((c) => {
        const im = isMounted(c);
        return (
          <SingleContainerDisplay
            key={c}
            container={getContainer(c)}
            isMounted={im}
          />
        );
      })}
    </Box>
  );
}

function SingleContainerDisplay(props: {
  container: MinecraftContainer;
  isMounted: boolean;
}): JSX.Element {
  const classes = useCardStyles();
  const mounted = useRef<boolean>(false);
  const [deleteAskOpen, setOpen] = useState(false);
  const [clearAskOpen, setClearOpen] = useState(false);
  const [operating, setOperating] = useState(false);
  const [coreCount, setCount] = useState(-1);
  const [isASC, setASCBit] = useState(false);
  const [refresh, setRefresh] = useState(false);
  useEffect(() => {
    mounted.current = true;
    if (props.isMounted) {
      (async () => {
        if (await isSharedContainer(props.container)) {
          if (mounted.current) {
            setASCBit(true);
          }
        }
        const cores = (await scanCoresIn(props.container)).length;
        if (mounted.current) {
          setCount(cores);
        }
      })();
    }
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  return (
    <Box>
      <OperatingHint open={operating} />
      <Card className={props.isMounted ? classes.card : classes.uCard}>
        <CardContent>
          <Box>
            <Tooltip title={tr("ContainerManager.Remove")}>
              <IconButton
                color={"inherit"}
                className={classes.operateButton}
                onClick={() => {
                  setOpen(true);
                }}
              >
                <LinkOff />
              </IconButton>
            </Tooltip>
            <Tooltip title={tr("ContainerManager.Clear")}>
              <IconButton
                color={"inherit"}
                className={classes.operateButton}
                onClick={() => {
                  setClearOpen(true);
                }}
              >
                <LayersClear />
              </IconButton>
            </Tooltip>

            <Dialog
              open={deleteAskOpen}
              onClose={() => {
                setOpen(false);
              }}
            >
              <DialogTitle>{tr("ContainerManager.AskRemove")}</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {tr(
                    "ContainerManager.AskRemoveDetail",
                    `ID=${props.container}`
                  )}
                </DialogContentText>
                <DialogActions>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      unlinkContainer(props.container.id);

                      setContainerListDirty();
                    }}
                  >
                    {tr("ContainerManager.Yes")}
                  </Button>
                  <Button
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    {tr("ContainerManager.No")}
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>
            <Dialog
              open={clearAskOpen}
              onClose={() => {
                setClearOpen(false);
              }}
            >
              <DialogTitle>{tr("ContainerManager.AskClear")}</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  {tr(
                    "ContainerManager.AskClearDetail",
                    `ID=${props.container.id}`
                  )}
                </DialogContentText>
                <DialogActions>
                  <Button
                    onClick={async () => {
                      setClearOpen(false);
                      setOperating(true);
                      await clearContainer(props.container.id);
                      unlinkContainer(props.container.id);
                      setContainerListDirty();
                      if (mounted.current) {
                        setOperating(false);
                      }
                    }}
                  >
                    {tr("ContainerManager.Yes")}
                  </Button>
                  <Button
                    onClick={() => {
                      setClearOpen(false);
                    }}
                  >
                    {tr("ContainerManager.No")}
                  </Button>
                </DialogActions>
              </DialogContent>
            </Dialog>
            {props.isMounted ? (
              <Tooltip title={tr("ContainerManager.Unmount")}>
                <IconButton
                  color={"inherit"}
                  className={classes.operateButton}
                  onClick={() => {
                    unmount(props.container.id);
                    setContainerListDirty();
                  }}
                >
                  <Eject />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={tr("ContainerManager.Mount")}>
                <IconButton
                  color={"inherit"}
                  className={classes.operateButton}
                  onClick={() => {
                    mount(props.container.id);
                    setContainerListDirty();
                    setRefresh(!refresh);
                  }}
                >
                  <Input />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={tr("ContainerManager.OpenInDir")}>
              <IconButton
                color={"inherit"}
                className={classes.operateButton}
                onClick={() => {
                  try {
                    shell.showItemInFolder(props.container.rootDir);
                  } catch {}
                }}
              >
                <FolderOpen />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant={"h6"} gutterBottom>
            {props.container.id}
          </Typography>
          <Typography
            color={"textSecondary"}
            className={classes.text}
            gutterBottom
          >
            {tr("ContainerManager.RootDir") + " " + props.container.rootDir}
          </Typography>
          {props.isMounted ? (
            <Typography
              color={"textSecondary"}
              className={classes.text}
              gutterBottom
            >
              {(coreCount >= 0
                ? tr("ContainerManager.Cores", `Count=${coreCount}`)
                : tr("ContainerManager.CoresLoading")) +
                " - " +
                tr(
                  isASC
                    ? "ContainerManager.Type.Shared"
                    : "ContainerManager.Type.Physical"
                )}
            </Typography>
          ) : (
            ""
          )}
        </CardContent>
      </Card>
      <br />
    </Box>
  );
}

function validateName(n: string): boolean {
  n = n.trim();
  if (n.length <= 0) {
    return true;
  }
  return !getAllContainers().includes(n);
}

async function validateDir(n: string): Promise<boolean> {
  n = n.trim();
  if (n.length <= 0) {
    return true;
  }
  n = path.resolve(n);
  if (getAllContainerPaths().includes(n)) {
    return false;
  }
  if (!(await isFileExist(n))) {
    return true;
  }
  return (await fs.stat(n)).isDirectory();
}

function AddNewContainer(props: {
  open: boolean;
  closeFunc: () => unknown;
  setOperate: (s: boolean) => unknown;
}): JSX.Element {
  const [selectedDir, setSelected] = useState("");
  const [usedName, setName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [dirError, setDirError] = useState(false);
  const [createASC, setCreateASC] = useState(false);
  const classes = useInputStyles();
  return (
    <Dialog
      open={props.open}
      onClose={() => {
        setName("");
        setSelected("");
      }}
    >
      <DialogTitle>{tr("ContainerManager.Add")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {tr("ContainerManager.AddDescription")}
        </DialogContentText>
        <TextField
          error={nameError}
          autoFocus
          className={classes.input}
          margin={"dense"}
          color={"secondary"}
          onChange={(e) => {
            const v = e.target.value;
            setNameError(!validateName(v));
            setName(v);
          }}
          label={
            nameError
              ? tr("ContainerManager.InvalidName")
              : tr("ContainerManager.EnterName")
          }
          type={"text"}
          spellCheck={false}
          fullWidth
          variant={"outlined"}
        />
        <TextField
          error={dirError}
          className={classes.input}
          autoFocus
          margin={"dense"}
          onChange={(e) => {
            setSelected(e.target.value);
            validateDir(e.target.value).then((b) => {
              setDirError(!b);
            });
          }}
          label={
            dirError
              ? tr("ContainerManager.InvalidDir")
              : tr("ContainerManager.Dir")
          }
          type={"text"}
          spellCheck={false}
          fullWidth
          disabled
          variant={"outlined"}
          value={selectedDir}
        />
        <RadioGroup
          row
          onChange={(e) => {
            switch (e.target.value) {
              case "Physical":
                setCreateASC(false);
                break;
              case "Shared":
                setCreateASC(true);
            }
          }}
        >
          <FormControlLabel
            value={"Physical"}
            control={<Radio checked={!createASC} />}
            label={tr("ContainerManager.Type.Physical")}
          />
          <FormControlLabel
            value={"Shared"}
            control={<Radio checked={createASC} />}
            label={tr("ContainerManager.Type.Shared")}
          />
        </RadioGroup>
        <Button
          className={classes.input}
          type={"button"}
          variant={"outlined"}
          onClick={async () => {
            const d = await remoteSelectDir();
            setSelected(d);
            validateDir(d).then((b) => {
              setDirError(!b);
            });
          }}
        >
          {tr("ContainerManager.Select")}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            props.closeFunc();
            setName("");
            setSelected("");
          }}
        >
          {tr("ContainerManager.Cancel")}
        </Button>
        <Button
          disabled={
            nameError ||
            dirError ||
            usedName.trim().length <= 0 ||
            selectedDir.trim().length <= 0
          }
          onClick={async () => {
            props.closeFunc();
            setName("");
            setSelected("");
            props.setOperate(true);
            await createContainer(usedName, selectedDir, createASC);
            props.setOperate(false);
          }}
        >
          {tr("ContainerManager.Continue")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export async function remoteSelectDir(): Promise<string> {
  return String((await ipcRenderer.invoke("selectDir")) || "");
}

async function createContainer(
  id: string,
  dir: string,
  asc = false
): Promise<void> {
  await createNewContainer(dir, id, asc);
}
