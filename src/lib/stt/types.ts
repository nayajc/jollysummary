export interface STTProvider {
  transcribe(file: File): Promise<string>
}
