import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

type FileDropzoneProps = {
  onFiles: (files: File[]) => void
}

export default function FileDropzone({ onFiles }: FileDropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted)
    },
    [onFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="dropzone" {...getRootProps()}>
      <input {...getInputProps()} />
      {isDragActive ? '파일을 여기에 놓으세요.' : '증빙 파일을 드래그하거나 클릭하여 업로드'}
    </div>
  )
}
