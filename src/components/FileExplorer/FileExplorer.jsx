import { useState, useEffect, useCallback } from "react";
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton,
  Paper,
  Breadcrumbs,
  Tooltip,
  CircularProgress,
  Button,
  Grid2 as Grid,
  Card,
  CardContent,
  CardActionArea,
  CardActions,
  Typography,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton as MuiIconButton,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  FolderOpen,
  InsertDriveFile,
  CloudUpload,
  ArrowUpward,
  CreateNewFolder,
  Close,
  Visibility,
  Edit as EditIcon,
  Refresh,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  CheckBox as CheckBoxIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  ContentCut as CutIcon,
  InfoOutlined
} from '@mui/icons-material';

import { 
  ref, 
  listAll, 
  getMetadata, 
  uploadBytes,
  deleteObject,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "../../firebase";
import Plyr from 'plyr-react';
import "plyr-react/plyr.css";
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { styled } from '@mui/material/styles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme, isDarkMode }) => ({
  '& .MuiBreadcrumbs-separator': {
    color: isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600],
  },
  '& .MuiBreadcrumbs-li': {
    '& .MuiChip-root': {
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      color: isDarkMode ? theme.palette.grey[400] : theme.palette.grey[600],
      border: 'none',
      '&:hover': {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      },
      '&.active': {
        backgroundColor: 'rgba(169, 169, 190, 0.29)',
        color: isDarkMode ? theme.palette.common.white : 'inherit',
      }
    }
  }
}));

function FileExplorer({ isDarkMode }) {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [renameFile, setRenameFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [folders, setFolders] = useState([]);
  const drawerWidth = 240;
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedForCopy, setSelectedForCopy] = useState(null);
  const [selectedForCut, setSelectedForCut] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsFile, setDetailsFile] = useState(null);

  useEffect(() => {
    fetchFiles(currentPath);
    fetchFolders();
  }, [currentPath]);

  const fetchFiles = async (path) => {
    try {
      setLoading(true);
      const normalizedPath = path === '/' ? '' : path;
      const storageRef = ref(storage, normalizedPath);
      const result = await listAll(storageRef);
      
      const filesData = await Promise.all([
        ...result.prefixes.map(async (folder) => ({
          id: folder.fullPath,
          name: folder.name,
          type: 'folder',
          path: folder.fullPath,
          size: 0,
          modified: new Date().toISOString()
        })),
        ...result.items.map(async (file) => {
          const metadata = await getMetadata(file);
          if (metadata.contentType === 'application/octet-stream') {
            return null;
          }
          const url = await getDownloadURL(file);
          return {
            id: file.fullPath,
            name: file.name,
            type: 'file',
            path: file.fullPath,
            size: metadata.size,
            modified: metadata.updated,
            url
          };
        })
      ]);

      setFiles(filesData.filter(Boolean));
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const storageRef = ref(storage, '');
      const result = await listAll(storageRef);
      
      const foldersData = await Promise.all(
        result.prefixes.map(async (folder) => ({
          id: folder.fullPath,
          name: folder.name,
          path: folder.fullPath,
        }))
      );

      setFolders(foldersData);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleUpload = async (event) => {
    try {
      setLoading(true);
      const files = Array.from(event.target.files);
      for (const file of files) {
        const fileRef = ref(storage, `${currentPath}/${file.name}`.replace(/^\//, ''));
        await uploadBytes(fileRef, file);
      }
      await Promise.all([
        fetchFiles(currentPath),
        fetchFolders()
      ]);
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      
      for (const file of selectedFiles) {
        try {
          if (file.type === 'folder') {
            const folderRef = ref(storage, file.path);
            const folderContents = await listAll(folderRef);
            
            await Promise.all(folderContents.items.map(item => deleteObject(ref(storage, item.fullPath))));
            
            const octetRef = ref(storage, `${file.path}/application.octet`);
            try {
              await deleteObject(octetRef);
            } catch {
              console.log('No application.octet file found');
            }
          } else {
            const fileRef = ref(storage, file.path);
            await deleteObject(fileRef);
          }
        } catch (error) {
          console.error(`Error deleting ${file.name}:`, error);
        }
      }

      setSelectedFiles([]);
      await Promise.all([
        fetchFiles(currentPath),
        fetchFolders()
      ]);

    } catch (error) {
      console.error('Error in delete operation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      try {
        setLoading(true);
        const folderPath = `${currentPath === '/' ? '' : currentPath}/${folderName}/application.octet`.replace(/^\//, '');
        const folderRef = ref(storage, folderPath);
        
        const emptyBlob = new Blob([''], { type: 'application/octet-stream' });
        
        await uploadBytes(folderRef, emptyBlob, {
          contentType: 'application/octet-stream',
          customMetadata: {
            isFolder: 'true'
          }
        });

        await Promise.all([
          fetchFiles(currentPath),
          fetchFolders()
        ]);
      } catch (error) {
        console.error('Error creating folder:', error);
        alert('Failed to create folder. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const isPreviewable = (file) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const textTypes = ['txt', 'md', 'json', 'js', 'css', 'html', 'xml'];
    const videoTypes = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const extension = file.name.split('.').pop().toLowerCase();
    
    return {
      isImage: imageTypes.includes(extension),
      isText: textTypes.includes(extension),
      isVideo: videoTypes.includes(extension)
    };
  };

  const handleFileClick = async (file) => {
    if (file.type === 'folder') {
      setCurrentPath(file.path);
    } else {
      const { isImage, isText, isVideo } = isPreviewable(file);
      
      if (isImage || isText || isVideo) {
        setPreviewFile(file);
        if (isText) {
          try {
            const response = await fetch(file.url);
            const text = await response.text();
            setPreviewContent(text);
          } catch (error) {
            console.error('Error loading text content:', error);
          }
        }
      } else {
        window.open(file.url, '_blank');
      }
    }
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
  };

  const handleRename = async (file) => {
    setRenameFile(file);
    setNewFileName(file.name);
  };

  const handleRenameSubmit = async () => {
    if (!renameFile || !newFileName || newFileName === renameFile.name) {
      setRenameFile(null);
      return;
    }

    try {
      setLoading(true);
      const oldFileRef = ref(storage, renameFile.path);
      const newPath = `${currentPath}/${newFileName}`.replace(/^\//, '');
      const newFileRef = ref(storage, newPath);

      if (renameFile.type === 'file') {
        const response = await fetch(renameFile.url);
        const blob = await response.blob();
        await uploadBytes(newFileRef, blob);
        await deleteObject(oldFileRef);
      } else {
        const folderContents = await listAll(oldFileRef);
        
        for (const item of folderContents.items) {
          const itemRef = ref(storage, item.fullPath);
          const newItemPath = item.fullPath.replace(renameFile.name, newFileName);
          const newItemRef = ref(storage, newItemPath);
          
          const itemUrl = await getDownloadURL(itemRef);
          const itemResponse = await fetch(itemUrl);
          const itemBlob = await itemResponse.blob();
          
          await uploadBytes(newItemRef, itemBlob);
          await deleteObject(itemRef);
        }
      }

      setRenameFile(null);
      await Promise.all([
        fetchFiles(currentPath),
        fetchFolders()
      ]);
    } catch (error) {
      console.error('Error renaming:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    if (!previewFile) return null;

    const { isImage, isText, isVideo } = isPreviewable(previewFile);

    return (
      <>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{previewFile.name}</Typography>
            <MuiIconButton onClick={handleClosePreview} size="small">
              <Close />
            </MuiIconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isImage ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              p={2}
            >
              <img
                src={previewFile.url}
                alt={previewFile.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          ) : isVideo ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              p={2}
              sx={{ width: '100%' }}
            >
              <Plyr
                source={{
                  type: 'video',
                  sources: [
                    {
                      src: previewFile.url,
                      type: `video/${previewFile.name.split('.').pop()}`
                    }
                  ]
                }}
                options={{
                  controls: [
                    'play-large',
                    'play',
                    'progress',
                    'current-time',
                    'mute',
                    'volume',
                    'captions',
                    'settings',
                    'pip',
                    'airplay',
                    'fullscreen'
                  ],
                  settings: ['captions', 'quality', 'speed', 'loop'],
                  quality: {
                    default: 1080,
                    options: [4320, 2880, 2160, 1440, 1080, 720, 576, 480, 360, 240]
                  },
                  speed: {
                    selected: 1,
                    options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
                  },
                  keyboard: { focused: true, global: true },
                  tooltips: { controls: true, seek: true },
                  fullscreen: { enabled: true, fallback: true, iosNative: true },
                  autoplay: false,
                  resetOnEnd: true,
                  invertTime: true,
                  displayDuration: true,
                  hideControls: true,
                  storage: { enabled: true, key: 'plyr' }
                }}
              />
            </Box>
          ) : isText ? (
            <Box
              component="pre"
              sx={{
                p: 2,
                backgroundColor: isDarkMode ? 'grey.800' : '#f5f5f5',
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '70vh',
                '& code': {
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: isDarkMode ? 'common.white' : 'common.black'
                }
              }}
            >
              <code>{previewContent}</code>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.open(previewFile.url, '_blank')}>
            Open in New Tab
          </Button>
          <Button onClick={handleClosePreview}>Close</Button>
        </DialogActions>
      </>
    );
  };

  const handleFileSelect = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const getBreadcrumbs = () => {
    const paths = currentPath.split('/').filter(Boolean);
    return [
      <Chip
        key="root"
        icon={<FolderOpen />}
        label="Root"
        onClick={() => setCurrentPath('/')}
        variant="outlined"
        size="small"
        className={currentPath === '/' ? 'active' : ''}
      />,
      ...paths.map((path, index) => {
        const fullPath = '/' + paths.slice(0, index + 1).join('/');
        return (
          <Chip
            key={fullPath}
            icon={<FolderOpen />}
            label={path}
            onClick={() => setCurrentPath(fullPath)}
            variant="outlined"
            size="small"
            className={index === paths.length - 1 ? 'active' : ''}
          />
        );
      })
    ];
  };

  const FolderSidebar = () => (
    <SimpleBar
      style={{ 
        height: '100%',
        width: drawerWidth,
      }}
    >
      <Box
        className="folder-sidebar"
        sx={{
          borderRight: 1,
          borderColor: isDarkMode ? 'grey.800' : 'grey.200',
          bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
          height: '100%',
          overflowX: 'hidden'
        }}
      >
        <Box sx={{ p: 2 }}>
          <List>
            <ListItem>
              <ListItemText 
                primary="Quick Access"
                primaryTypographyProps={{
                  variant: 'subtitle2',
                  color: isDarkMode ? 'grey.400' : 'text.secondary',
                }}
              />
            </ListItem>
            {folders.map((folder) => (
              <ListItemButton
                key={folder.id}
                onClick={() => setCurrentPath(folder.path)}
                selected={currentPath === folder.path}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: isDarkMode ? 'grey.800' : 'action.selected',
                  },
                  '&:hover': {
                    bgcolor: isDarkMode ? 'grey.800' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon>
                  <FolderOpen 
                    color={isDarkMode ? 'info' : 'primary'}
                    sx={{ fontSize: 24 }}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={folder.name}
                  sx={{
                    '& .MuiTypography-root': {
                      color: isDarkMode ? 'common.white' : 'common.black',
                    }
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>
    </SimpleBar>
  );

  const refreshExplorer = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchFiles(currentPath),
        fetchFolders()
      ]);
    } catch (error) {
      console.error('Error refreshing explorer:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  const handleContextMenu = (event, file) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      file: file
    });
    handleFileSelect(file);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleCopy = () => {
    setSelectedForCopy(contextMenu.file);
    setSelectedForCut(null);
    handleCloseContextMenu();
  };

  const handleCut = () => {
    setSelectedForCut(contextMenu.file);
    setSelectedForCopy(null);
    handleCloseContextMenu();
  };

  const handlePaste = async () => {
    if (!selectedForCopy && !selectedForCut) return;
    
    const fileToPaste = selectedForCopy || selectedForCut;
    const currentFolder = currentPath;
    
    try {
      setLoading(true);
      if (fileToPaste.type === 'file') {
        const oldFileRef = ref(storage, fileToPaste.path);
        const newPath = `${currentFolder}/${fileToPaste.name}`.replace(/^\//, '');
        const newFileRef = ref(storage, newPath);
        
        const url = await getDownloadURL(oldFileRef);
        const response = await fetch(url);
        const blob = await response.blob();
        await uploadBytes(newFileRef, blob);
        
        if (selectedForCut) {
          await deleteObject(oldFileRef);
          setSelectedForCut(null);
        }
      }
      
      await refreshExplorer();
      handleCloseContextMenu();
    } catch (error) {
      console.error('Error pasting file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = () => {
    setDetailsFile(contextMenu.file);
    setShowDetails(true);
    handleCloseContextMenu();
  };

  const renderDetails = () => {
    if (!detailsFile) return null;

    return (
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
            color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">File Details</Typography>
            <MuiIconButton onClick={() => setShowDetails(false)} size="small">
              <Close />
            </MuiIconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <Stack spacing={2} >
              <Box >
                <Typography variant="subtitle2" color={{color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey' }}>Name:</Typography>
                <Typography>{detailsFile.name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color={{color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey' }}>Type:</Typography>
                <Typography>{detailsFile.type}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color={{color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey' }}>Path:</Typography>
                <Typography>{detailsFile.path}</Typography>
              </Box>
              {detailsFile.type === 'file' && (
                <Box>
                  <Typography variant="subtitle2" color={{color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey' }}>Size:</Typography>
                  <Typography>{(detailsFile.size / 1024).toFixed(2)} KB</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" color={{color: isDarkMode ? 'rgba(242, 242, 242, 0.8)' : 'common.grey' }}>Modified:</Typography>
                <Typography>{new Date(detailsFile.modified).toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Paper 
      className="file-explorer"
      sx={{ 
        bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
        color: isDarkMode ? 'common.white' : 'common.black',
      }}
    >
      <Box sx={{ display: 'flex', height: '100%' }}>
        <FolderSidebar />
        <SimpleBar style={{ flex: 1, height: '100%', width: '100%' }}>
          <Box sx={{ p: 2, width: '100%', maxWidth: '95%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <StyledBreadcrumbs 
                separator={<NavigateNextIcon fontSize="small" />}
                isDarkMode={isDarkMode}
              >
                {getBreadcrumbs()}
              </StyledBreadcrumbs>
              <Box>
                <Button
                  startIcon={<Refresh />}
                  variant="contained"
                  onClick={refreshExplorer}
                  sx={{ mr: 1 }}
                >
                  Refresh
                </Button>
                <input
                  type="file"
                  multiple
                  onChange={handleUpload}
                  style={{ display: 'none' }}
                  id="upload-input"
                />
                <label htmlFor="upload-input">
                  <Button
                    component="span"
                    startIcon={<CloudUpload />}
                    variant="contained"
                    sx={{ mr: 1 }}
                  >
                    Upload
                  </Button>
                </label>
                <Button
                  startIcon={<CreateNewFolder />}
                  variant="contained"
                  onClick={handleCreateFolder}
                  sx={{ mr: 1 }}
                >
                  New Folder
                </Button>
                {selectedFiles.length > 0 && (
                  <Button
                    startIcon={<DeleteIcon />}
                    variant="contained"
                    color="error"
                    onClick={handleDelete}
                  >
                    Delete ({selectedFiles.length})
                  </Button>
                )}
              </Box>
            </Box>

            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid 
                container 
                spacing={2} 
                sx={{ 
                  width: '100%',
                  margin: 0,
                  '& .MuiGrid-item': {
                    paddingTop: 2,
                    paddingLeft: 2,
                  }
                }}
              >
                {currentPath !== '/' && (
                  <Grid xs={12} sm={6} md={4} lg={3}>
                    <Card 
                      variant="outlined"
                      sx={{
                        bgcolor: isDarkMode ? 'grey.800' : 'background.paper',
                        color: isDarkMode ? 'common.white' : 'common.black',
                        width: '100%'
                      }}
                      onClick={() => {
                        const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                        setCurrentPath(parentPath);
                      }}
                    >
                      <CardActionArea>
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <ArrowUpward color={isDarkMode ? 'inherit' : 'action'} />
                            <Typography variant="body1">Parent Directory</Typography>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                )}
                
                {files.map((file) => (
                  <Grid xs={12} sm={6} md={4} lg={3} key={file.id}>
                    <Card 
                      variant="outlined"
                      sx={{
                        bgcolor: selectedFiles.some(f => f.id === file.id) 
                          ? isDarkMode ? 'grey.700' : 'action.selected'
                          : isDarkMode ? 'grey.800' : 'background.paper',
                        color: isDarkMode ? 'common.white' : 'common.black',
                        width: '100%'
                      }}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                    >
                      <CardActionArea
                        onClick={() => handleFileClick(file)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleFileSelect(file);
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            {file.type === 'folder' ? 
                              <FolderOpen color={isDarkMode ? 'inherit' : 'inherit'} sx={{ fontSize: 40, flexShrink: 0 }} /> : 
                              <InsertDriveFile color={isDarkMode ? 'inherit' : 'action'} sx={{ fontSize: 40, flexShrink: 0 }} />
                            }
                            <Typography 
                              variant="body1" 
                              noWrap 
                              title={file.name}
                              className="file-name"
                              sx={{ 
                                flexGrow: 1,
                                minWidth: 0
                              }}
                            >
                              {file.name}
                            </Typography>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                      <CardActions sx={{ justifyContent: 'flex-end' }}>
                        {!file.isDirectory && isPreviewable(file).isImage && (
                          <Tooltip title="Preview">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(file);
                              }}
                              sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Rename">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(file);
                            }}
                            sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Select">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileSelect(file);
                            }}
                            sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }}
                          >
                            {selectedFiles.some(f => f.id === file.id) ? (
                              <CheckBoxIcon 
                                fontSize="small"
                                color="primary"
                              />
                            ) : (
                              <CheckBoxOutlineBlankIcon 
                                fontSize="small"
                                sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }}
                              />
                            )}
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </SimpleBar>
      </Box>
      <Dialog
        open={!!previewFile}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
            color: isDarkMode ? 'rbga(209, 209, 209, 0.8)' : 'common.grey'
          }
        }}
      >
        {renderPreview()}
      </Dialog>
      <Dialog
        open={!!renameFile}
        onClose={() => setRenameFile(null)}
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
            color: isDarkMode ? 'rbga(209, 209, 209, 0.8)' : 'common.grey'
          }
        }}
      >
        <DialogTitle>Rename {renameFile?.type}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New name"
            fullWidth
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: isDarkMode ? 'common.white' : 'common.black',
              },
              '& .MuiInputLabel-root': {
                color: isDarkMode ? 'grey.400' : 'inherit',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameFile(null)}>Cancel</Button>
          <Button onClick={handleRenameSubmit} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        sx={{
          '& .MuiPaper-root': {
            bgcolor: isDarkMode ? 'grey.900' : 'background.paper',
            borderRadius: 2,
            color: isDarkMode ? 'common.white' : 'common.black',
          }
        }}
      > 
        <MenuItem onClick={handleCopy}>
          <ListItemIcon>
            <CopyIcon fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
          </ListItemIcon>
          Copy
        </MenuItem>
        <MenuItem onClick={handleCut}>
          <ListItemIcon>
            <CutIcon fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
          </ListItemIcon>
          Cut
        </MenuItem>
        {(selectedForCopy || selectedForCut) && (
          <MenuItem onClick={handlePaste}>
            <ListItemIcon>
              <PasteIcon fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
            </ListItemIcon>
            Paste
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          handleRename(contextMenu.file);
          handleCloseContextMenu();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
          </ListItemIcon>
          Rename
        </MenuItem>
        {contextMenu?.file && !contextMenu.file.isDirectory && isPreviewable(contextMenu.file).isImage && (
          <MenuItem onClick={() => {
            handleFileClick(contextMenu.file);
            handleCloseContextMenu();
          }}>
            <ListItemIcon>
              <Visibility fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
            </ListItemIcon>
            Preview
          </MenuItem>
        )}
        <MenuItem onClick={handleShowDetails}>
          <ListItemIcon>
            <InfoOutlined fontSize="small" sx={{ color: isDarkMode ? 'grey.400' : 'inherit' }} />
          </ListItemIcon>
          Details
        </MenuItem>
      </Menu>
      {renderDetails()}
    </Paper>
  );
}

FileExplorer.propTypes = {
  isDarkMode: PropTypes.bool.isRequired
};

export default FileExplorer;
